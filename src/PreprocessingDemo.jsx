import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Play, Pause, ChevronLeft, ChevronRight, Upload,
  CheckCircle2, XCircle, AlertCircle, Terminal,
} from 'lucide-react';

// ============ DATA ============

const PIPELINE_STEPS = [
  {
    id: 'dicom',
    title: 'DICOM',
    short: 'Hospital scanner output',
    image: 'preprocessing-demo/01_dicom.png',
    description: 'Hospital MRI scanners output DICOM files: hundreds of small .dcm files per scan, one per slice. Each file contains pixel data plus metadata like patient ID and acquisition timestamps.',
    why: 'DICOM is the medical imaging standard but Python neuroimaging libraries (nibabel, MONAI, SimpleITK) cannot read it directly. We need to convert to NIfTI first.',
    tool: 'dcm2niix (via dicomtonifti_2.py)',
    flag: 'input',
  },
  {
    id: 'raw',
    title: 'Raw NIfTI',
    short: 'Single .nii.gz file',
    image: 'preprocessing-demo/02_raw_nifti.png',
    description: 'After conversion: one .nii.gz file per scan, containing the full 3D volume. Skull, scalp, eyes, neck still visible. Patient was tilted in scanner. Voxels are anisotropic — thicker slices in one direction.',
    why: 'This is what comes out of dcm2niix. Now we need to clean it up: align to a standard frame, remove skull, fix bias, standardize voxel size.',
    tool: 'nibabel',
    flag: 'problem',
  },
  {
    id: 'mni',
    title: 'MNI Registered',
    short: 'Aligned to template brain',
    image: 'preprocessing-demo/03_mni_registered.png',
    description: 'Each scan is aligned to the MNI152 template brain — a standard reference made by averaging 152 healthy volunteers. Patient tilt is corrected. Anatomical structures land at the same voxel coordinates across all patients.',
    why: 'Without registration, the hippocampus might be at voxel (90, 130, 75) in one patient and (95, 140, 70) in another. Registration ensures consistent coordinates so cohort-level analysis becomes possible.',
    tool: 'SimpleITK rigid + affine transform',
    flag: 'fix',
  },
  {
    id: 'skull',
    title: 'Skull Stripped',
    short: 'Brain tissue only',
    image: 'preprocessing-demo/04_skull_stripped.png',
    description: 'HD-BET (a 3D U-Net pretrained for brain extraction) removes everything that is not brain: skull, scalp, eyes, neck, fat. Only brain tissue and its immediate boundaries remain.',
    why: 'BrainIAC was pretrained exclusively on skull-stripped brains. The skull signal can be brighter than brain in some sequences (T1-weighted especially), which would mislead model attention.',
    tool: 'HD-BET (Heidelberg, 2019) — 3D U-Net',
    flag: 'fix',
  },
  {
    id: 'n4',
    title: 'N4 Bias Corrected',
    short: 'Uniform tissue intensity',
    image: 'preprocessing-demo/05_n4_corrected.png',
    description: 'N4 algorithm models and removes the smooth low-frequency intensity gradient (bias field) introduced by the scanner. Now the same tissue type has consistent brightness across the brain.',
    why: 'Without bias correction, the model would interpret intensity variations from scanner artifacts as anatomical differences. Two scans of the same patient on different scanners would produce different feature vectors.',
    tool: 'SimpleITK N4BiasFieldCorrection (Tustison, 2010)',
    flag: 'fix',
  },
  {
    id: 'resampled',
    title: 'Resampled to 1mm Isotropic',
    short: 'Standard voxel size',
    image: 'preprocessing-demo/06_resampled.png',
    description: 'Voxel grid resampled to 1mm × 1mm × 1mm. Anisotropic voxels (thick slices) are interpolated so every dimension is equal. The scan now has consistent anatomical scale.',
    why: 'BrainIAC was pretrained at 1mm isotropic resolution. Different voxel sizes distort the spatial relationships the model learned. A 5mm-thick slice and a 1mm-thick slice carry different amounts of information per voxel.',
    tool: 'SimpleITK resample with linear interpolation',
    flag: 'fix',
  },
  {
    id: 'ready',
    title: 'BrainIAC Ready',
    short: 'Normalized intensity, encoder-ready',
    image: 'preprocessing-demo/07_final.png',
    description: 'Final step: normalize intensity values to the [0, 1] range. Different scanners output different raw intensity ranges (some 0–1000, others 0–5000). Normalization standardizes this so the model sees consistent inputs.',
    why: 'Raw scanner intensities vary by hardware, sequence, and acquisition parameters. Normalization removes that source of variability so the model focuses on anatomical content.',
    tool: 'numpy normalize to [0, 1]',
    flag: 'output',
  },
];

const FLAG_COLORS = {
  input: '#8b94a3',
  problem: '#ef4444',
  fix: '#2dd4bf',
  output: '#a78bfa',
};

// ============ PIPELINE DIAGRAM ============

function PipelineDiagram() {
  const boxes = [
    { fill: '#0d1015', stroke: '#2a3038', titleColor: '#f0f2f5', subColor: '#8b94a3', title: 'DICOM',     l1: '.dcm files',  l2: '' },
    { fill: '#1a0a0a', stroke: '#7c2d12', titleColor: '#fca5a5', subColor: '#dc2626', title: 'Raw NIfTI', l1: '.nii.gz',     l2: 'unprocessed' },
    { fill: '#062a1f', stroke: '#0d3b2a', titleColor: '#5eead4', subColor: '#2dd4bf', title: 'MNI',       l1: 'aligned to',  l2: 'template' },
    { fill: '#062a1f', stroke: '#0d3b2a', titleColor: '#5eead4', subColor: '#2dd4bf', title: 'Skull strip', l1: 'brain only', l2: 'HD-BET' },
    { fill: '#062a1f', stroke: '#0d3b2a', titleColor: '#5eead4', subColor: '#2dd4bf', title: 'N4',        l1: 'bias field',  l2: 'removed' },
    { fill: '#062a1f', stroke: '#0d3b2a', titleColor: '#5eead4', subColor: '#2dd4bf', title: 'Resample',  l1: '1mm',         l2: 'isotropic' },
    { fill: '#1a0d2e', stroke: '#4c1d95', titleColor: '#c4b5fd', subColor: '#a78bfa', title: 'Ready',     l1: 'encoder',     l2: 'input' },
  ];

  const subLabels = [
    'Hospital output', 'After dcm2niix', 'Aligned position',
    'Brain isolated', 'Uniform brightness', 'Standard voxels', 'Normalized',
  ];

  return (
    <div className="border" style={{ background: '#0d1015', borderColor: '#1f242c', padding: '24px', marginBottom: '32px' }}>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
          Get the code
        </div>
        <div className="flex items-start gap-3 p-3 font-mono text-xs"
             style={{ background: '#0a0c10', border: '1px solid #1f242c', color: '#d1d5db', overflowX: 'auto' }}>
          <Terminal size={14} style={{ color: '#8b94a3', marginTop: '2px', flexShrink: 0 }} />
          <div>
            git clone https://github.com/AIM-KannLab/BrainIAC.git<br />
            cd BrainIAC/src
          </div>
        </div>
      </div>

      <svg width="100%" viewBox="0 0 680 240" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrow-pp" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </marker>
        </defs>

        {boxes.map((b, i) => {
          const x = i * 100;
          return (
            <g key={i}>
              <rect x={x} y="60" width="80" height="60" rx="4" fill={b.fill} stroke={b.stroke} strokeWidth="0.5" />
              <text x={x + 40} y="83" textAnchor="middle" fill={b.titleColor} fontSize="12" fontWeight="600">{b.title}</text>
              <text x={x + 40} y="101" textAnchor="middle" fill={b.subColor} fontSize="10">{b.l1}</text>
              {b.l2 && <text x={x + 40} y="113" textAnchor="middle" fill={b.subColor} fontSize="10">{b.l2}</text>}
            </g>
          );
        })}

        {boxes.slice(0, -1).map((_, i) => (
          <line key={`arr-${i}`} x1={i * 100 + 80} y1="90" x2={(i + 1) * 100} y2="90"
                stroke="#5b6472" strokeWidth="1.5" markerEnd="url(#arrow-pp)" />
        ))}

        {subLabels.map((lbl, i) => (
          <text key={`sub-${i}`} x={i * 100 + 40} y="148" textAnchor="middle" fill="#5b6472" fontSize="10">{lbl}</text>
        ))}

        <rect x="115" y="180" width="450" height="36" rx="4" fill="#0a0c10" stroke="#1f242c" strokeWidth="0.5" />
        <text x="340" y="196" textAnchor="middle" fill="#8b94a3" fontSize="11">Single command runs steps 2–7 in sequence:</text>
        <text x="340" y="211" textAnchor="middle" fill="#d1d5db" fontSize="11" fontFamily="monospace">python preprocessing/mri_preprocess_3d_simple.py</text>
      </svg>
    </div>
  );
}

// ============ INPUT REQUIREMENTS ============

function InputRequirements() {
  const requirements = [
    { label: 'File format', value: '.nii or .nii.gz', note: 'NIfTI is the standard neuroimaging format. DICOM must be converted first.' },
    { label: 'Voxel size', value: '1.0 × 1.0 × 1.0 mm', note: 'Isotropic. Other voxel sizes distort the anatomical scale the model learned.' },
    { label: 'Coordinate system', value: 'MNI152 aligned', note: 'All scans share one reference frame. Anatomy lands at the same coordinates.' },
    { label: 'Brain only', value: 'Skull stripped', note: 'Skull, scalp, eyes, neck removed. Only brain tissue. Otherwise model attention is misled.' },
    { label: 'Intensity', value: 'Bias-corrected, [0, 1]', note: 'Scanner intensity bias removed. Values normalized so different scanners produce comparable inputs.' },
    { label: 'Sequences', value: 'T1, T1CE, T2, FLAIR', note: 'Pretraining covered all four. The encoder generalizes across sequence types.' },
  ];

  return (
    <div className="border" style={{ background: '#0d1015', borderColor: '#1f242c', padding: '24px', marginBottom: '40px' }}>
      <div className="font-serif text-xl mb-4" style={{ color: '#f0f2f5' }}>What does BrainIAC expect as input?</div>

      <p className="text-sm leading-relaxed mb-4" style={{ color: '#8b94a3' }}>
        BrainIAC was pretrained on 32,000 brain MRI scans, all preprocessed in a specific format.
        For the encoder to produce meaningful features, every input scan must match that format.
        The preprocessing pipeline above transforms raw hospital scans into BrainIAC-ready inputs.
      </p>

      <div className="p-4 mb-6 text-sm leading-relaxed"
           style={{ background: '#0a0c10', borderLeft: '3px solid #8b94a3', color: '#d1d5db' }}>
        <span className="font-medium" style={{ color: '#f0f2f5' }}>Why NIfTI and not DICOM? </span>
        NIfTI (Neuroimaging Informatics Technology Initiative) stores a complete 3D volume in a single
        .nii.gz file with a clean header for spatial metadata (voxel size, orientation, affine matrix).
        DICOM scatters the same volume across hundreds of files with hospital-specific metadata. Every
        Python neuroimaging library (nibabel, MONAI, SimpleITK, BrainIAC) reads NIfTI natively. DICOM
        must be converted first using dcm2niix, which is exactly what step 1 does.
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {requirements.map((req, i) => (
          <div key={i} className="p-4" style={{ background: '#0a0c10', border: '1px solid #1f242c' }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>
              {req.label}
            </div>
            <div className="font-mono text-sm mb-2" style={{ color: '#f0f2f5' }}>{req.value}</div>
            <div className="text-xs leading-relaxed" style={{ color: '#5b6472' }}>{req.note}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 text-sm leading-relaxed"
           style={{ background: 'rgba(45, 212, 191, 0.05)', borderLeft: '3px solid #2dd4bf', color: '#d1d5db' }}>
        <span className="font-medium" style={{ color: '#2dd4bf' }}>Safe default: </span>
        If you are not sure whether your scan meets these criteria, run the preprocessing pipeline anyway.
        It is idempotent on already-processed scans (no harm done) and ensures consistency across your entire cohort.
      </div>
    </div>
  );
}

// ============ WALKTHROUGH ============

function Walkthrough() {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(() => {
      if (currentStep < PIPELINE_STEPS.length - 1) setCurrentStep(currentStep + 1);
      else setAutoPlay(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentStep, autoPlay]);

  const step = PIPELINE_STEPS[currentStep];
  const flagColor = FLAG_COLORS[step.flag];

  return (
    <div className="mb-12">
      <div className="font-serif text-xl mb-2" style={{ color: '#f0f2f5' }}>Walk through the pipeline</div>
      <p className="text-sm mb-6" style={{ color: '#8b94a3' }}>
        Step through each preprocessing stage. See what changes, why, and which tool does it.
      </p>

      <div className="flex gap-1 mb-2">
        {PIPELINE_STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setCurrentStep(i); setAutoPlay(false); }}
            className="flex-1 transition-all"
            style={{
              height: '4px',
              background: i <= currentStep ? FLAG_COLORS[s.flag] : '#1f242c',
              border: 'none', cursor: 'pointer',
            }}
            aria-label={`Go to step ${i + 1}: ${s.title}`}
          />
        ))}
      </div>

      <div className="flex gap-1 mb-6">
        {PIPELINE_STEPS.map((s, i) => (
          <div key={s.id} className="flex-1 text-center text-[10px] uppercase tracking-wider"
               style={{ color: i === currentStep ? '#f0f2f5' : '#5b6472', letterSpacing: '0.1em' }}>
            {s.title}
          </div>
        ))}
      </div>

      <div className="border grid md:grid-cols-2 gap-8 p-6"
           style={{ background: '#0d1015', borderColor: '#1f242c', minHeight: '480px' }}>
        <div>
          <img src={step.image} alt={step.title} style={{ width: '100%', background: '#000' }} />
        </div>

        <div>
          <div className="inline-block px-2 py-1 text-xs uppercase tracking-widest mb-3"
               style={{
                 background: `${flagColor}1a`, color: flagColor,
                 letterSpacing: '0.15em', fontWeight: 600,
               }}>
            Step {currentStep + 1} of {PIPELINE_STEPS.length}
          </div>

          <div className="font-serif text-2xl mb-1" style={{ color: '#f0f2f5' }}>{step.title}</div>
          <div className="text-sm italic mb-6" style={{ color: '#8b94a3' }}>{step.short}</div>

          <div className="mb-5">
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#5b6472', letterSpacing: '0.15em' }}>
              What happens
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>{step.description}</p>
          </div>

          <div className="mb-5">
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#5b6472', letterSpacing: '0.15em' }}>
              Why this step matters
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>{step.why}</p>
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid #1f242c' }}>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#5b6472', letterSpacing: '0.15em' }}>
              Tool
            </div>
            <div className="font-mono text-xs" style={{ color: '#d1d5db' }}>{step.tool}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center gap-3 mt-4">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all"
          style={{
            background: currentStep === 0 ? '#0d1015' : '#1f242c',
            color: currentStep === 0 ? '#5b6472' : '#f0f2f5',
            border: '1px solid #1f242c',
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          <ChevronLeft size={14} /> Previous
        </button>

        <button
          onClick={() => setAutoPlay(!autoPlay)}
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all"
          style={{
            background: autoPlay ? '#7f1d1d' : '#2dd4bf',
            color: autoPlay ? '#fca5a5' : '#0a0c10',
            border: 'none', cursor: 'pointer',
            letterSpacing: '0.1em', fontWeight: 600,
          }}
        >
          {autoPlay ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Auto-play (4s/step)</>}
        </button>

        <button
          onClick={() => setCurrentStep(Math.min(PIPELINE_STEPS.length - 1, currentStep + 1))}
          disabled={currentStep === PIPELINE_STEPS.length - 1}
          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all"
          style={{
            background: currentStep === PIPELINE_STEPS.length - 1 ? '#0d1015' : '#1f242c',
            color: currentStep === PIPELINE_STEPS.length - 1 ? '#5b6472' : '#f0f2f5',
            border: '1px solid #1f242c',
            cursor: currentStep === PIPELINE_STEPS.length - 1 ? 'not-allowed' : 'pointer',
            letterSpacing: '0.1em',
          }}
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ============ SCAN CHECKER ============

const STANDARD_MNI_SHAPES = [[182, 218, 182], [193, 229, 193]];
const BRATS_SHAPE = [240, 240, 155];

function checkScan(metadata) {
  const checks = [];
  const { dims, pixDims, affine } = metadata;
  const [, x, y, z] = dims;
  const [, sx, sy, sz] = pixDims;

  const shapeStr = `${x} × ${y} × ${z}`;
  const isStandardMNI = STANDARD_MNI_SHAPES.some(s => s[0] === x && s[1] === y && s[2] === z);
  const isBrats = BRATS_SHAPE[0] === x && BRATS_SHAPE[1] === y && BRATS_SHAPE[2] === z;

  if (isStandardMNI) checks.push({ label: 'Shape', value: shapeStr, status: 'pass', message: 'Matches MNI152 template dimensions.' });
  else if (isBrats) checks.push({ label: 'Shape', value: shapeStr, status: 'warn', message: 'BraTS format (SRI24 atlas, not MNI152). May need re-registration.' });
  else checks.push({ label: 'Shape', value: shapeStr, status: 'fail', message: 'Non-standard shape — likely raw scanner output. Registration needed.' });

  const voxelStr = `${sx.toFixed(2)} × ${sy.toFixed(2)} × ${sz.toFixed(2)} mm`;
  const isIsotropic1mm = Math.abs(sx - 1.0) < 0.01 && Math.abs(sy - 1.0) < 0.01 && Math.abs(sz - 1.0) < 0.01;
  if (isIsotropic1mm) checks.push({ label: 'Voxel size', value: voxelStr, status: 'pass', message: '1mm isotropic — matches BrainIAC pretraining resolution.' });
  else checks.push({ label: 'Voxel size', value: voxelStr, status: 'fail', message: 'Not 1mm isotropic. Resampling needed.' });

  if (affine) {
    const rot = [[affine[0], affine[1], affine[2]], [affine[4], affine[5], affine[6]], [affine[8], affine[9], affine[10]]];
    let offDiag = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (i !== j) offDiag += Math.abs(rot[i][j]);
    if (offDiag < 0.01) checks.push({ label: 'Orientation', value: 'axis-aligned', status: 'pass', message: 'Affine matrix is axis-aligned — consistent with MNI alignment.' });
    else checks.push({ label: 'Orientation', value: `rotated (off-diagonal: ${offDiag.toFixed(2)})`, status: 'warn', message: 'Affine matrix has rotation. May need re-registration.' });
  }

  return checks;
}

async function parseNiftiHeader(file) {
  let buffer = await file.arrayBuffer();
  const view0 = new Uint8Array(buffer, 0, 2);
  if (view0[0] === 0x1f && view0[1] === 0x8b) {
    if (typeof DecompressionStream !== 'undefined') {
      const ds = new DecompressionStream('gzip');
      const stream = new Blob([buffer]).stream().pipeThrough(ds);
      buffer = await new Response(stream).arrayBuffer();
    } else throw new Error('Browser does not support gzip decompression.');
  }
  if (buffer.byteLength < 348) throw new Error('File too small to be a valid NIfTI');
  const view = new DataView(buffer);
  if (view.getInt32(0, true) !== 348) throw new Error('Not a valid NIfTI-1 file');
  const dims = []; for (let i = 0; i < 8; i++) dims.push(view.getInt16(40 + i * 2, true));
  const pixDims = []; for (let i = 0; i < 8; i++) pixDims.push(view.getFloat32(76 + i * 4, true));
  const sformCode = view.getInt16(254, true);
  const affine = []; for (let i = 0; i < 12; i++) affine.push(view.getFloat32(280 + i * 4, true));
  affine.push(0, 0, 0, 1);
  return { dims, pixDims, sformCode, affine };
}

function ScanChecker() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [checks, setChecks] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (selected) => {
    if (!selected) return;

    // Reset all state before parsing new file
    setError(null);
    setMetadata(null);
    setChecks(null);
    setFile(selected);

    if (!selected.name.endsWith('.nii') && !selected.name.endsWith('.nii.gz')) {
      setError('Please select a .nii or .nii.gz file.');
      return;
    }
    try {
      const meta = await parseNiftiHeader(selected);
      setMetadata(meta);
      setChecks(checkScan(meta));
    } catch (e) {
      setError(e.message || 'Failed to parse file');
    }
  }, []);

  // Reset input value so the same file can be re-selected
  const handleFileInputChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    handleFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const allPass = checks && checks.every(c => c.status === 'pass');
  const hasFail = checks && checks.some(c => c.status === 'fail');

  const statusColor = allPass ? '#2dd4bf' : hasFail ? '#ef4444' : '#fbbf24';
  const statusBg = allPass ? 'rgba(45, 212, 191, 0.05)' : hasFail ? 'rgba(239, 68, 68, 0.05)' : 'rgba(251, 191, 36, 0.05)';

  return (
    <div>
      <div className="font-serif text-xl mb-2" style={{ color: '#f0f2f5' }}>Check your own scan</div>
      <p className="text-sm mb-6" style={{ color: '#8b94a3' }}>
        Drop a NIfTI file (.nii or .nii.gz) below. We read the header in your browser — no upload, no server.
        The scan stays on your device.
      </p>

      <div
        onDrop={onDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        className="text-center cursor-pointer transition-all p-12 mb-6"
        style={{
          background: dragOver ? 'rgba(45, 212, 191, 0.05)' : '#0d1015',
          border: `2px dashed ${dragOver ? '#2dd4bf' : '#1f242c'}`,
        }}
      >
        <input ref={fileInputRef} type="file" accept=".nii,.nii.gz" style={{ display: 'none' }}
               onChange={handleFileInputChange} />
        <Upload size={36} style={{ color: '#5b6472', margin: '0 auto 16px' }} />
        <div className="font-serif text-lg mb-2" style={{ color: '#f0f2f5' }}>
          {dragOver ? 'Drop the file here' : 'Drag and drop a NIfTI file'}
        </div>
        <div className="text-xs" style={{ color: '#8b94a3' }}>
          or click to select. Accepts .nii or .nii.gz.
        </div>
        {file && (
          <div className="mt-4 text-xs" style={{ color: '#2dd4bf' }}>
            Loaded: <code className="px-2 py-1 font-mono"
                          style={{ background: '#0a0c10', border: '1px solid #1f242c' }}>{file.name}</code>
            <span style={{ color: '#5b6472' }}> ({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 mb-4 text-sm"
             style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid #7f1d1d', color: '#fca5a5' }}>
          <span className="font-medium">Error: </span>{error}
        </div>
      )}

      {metadata && checks && (
        <>
          <div className="p-5 mb-4" style={{ background: statusBg, border: `1px solid ${statusColor}` }}>
            <div className="font-serif text-xl mb-1" style={{ color: statusColor }}>
              {allPass ? 'Scan appears BrainIAC-ready' : hasFail ? 'Preprocessing required' : 'May need preprocessing'}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: '#d1d5db' }}>
              {allPass
                ? 'All standard checks pass. You can pass this scan directly to the BrainIAC encoder.'
                : 'Run the BrainIAC preprocessing pipeline to standardize this scan before feature extraction.'}
            </div>
            {!allPass && (
              <div className="mt-4 p-3 font-mono text-xs"
                   style={{ background: '#0a0c10', color: '#d1d5db', border: '1px solid #1f242c' }}>
                python preprocessing/mri_preprocess_3d_simple.py \<br />
                &nbsp;&nbsp;--temp_img preprocessing/atlases/temp_head.nii.gz \<br />
                &nbsp;&nbsp;--input_dir ./your_scans \<br />
                &nbsp;&nbsp;--output_dir ./processed
              </div>
            )}
          </div>

          <div className="p-4 mb-6 text-sm leading-relaxed"
               style={{ background: '#0a0c10', borderLeft: '3px solid #fbbf24', color: '#d1d5db' }}>
            <span className="font-medium" style={{ color: '#fbbf24' }}>Note: </span>
            This check reads only the file header metadata (shape, voxel size, affine matrix). It cannot
            determine whether skull stripping or N4 bias correction have been applied — those require
            visual inspection of the actual scan content. When in doubt, run the preprocessing pipeline
            anyway. It is idempotent and safe.
          </div>

          <div className="space-y-2">
            {checks.map((check, i) => {
              const c = check.status === 'pass' ? '#2dd4bf' : check.status === 'fail' ? '#ef4444' : '#fbbf24';
              const Icon = check.status === 'pass' ? CheckCircle2 : check.status === 'fail' ? XCircle : AlertCircle;
              return (
                <div key={i} className="p-4" style={{ background: '#0d1015', border: `1px solid ${c}` }}>
                  <div className="flex items-start gap-3">
                    <Icon size={20} style={{ color: c, flexShrink: 0, marginTop: '1px' }} />
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-medium text-sm" style={{ color: '#f0f2f5' }}>{check.label}</span>
                        <span className="font-mono text-xs" style={{ color: '#8b94a3' }}>{check.value}</span>
                      </div>
                      <div className="text-xs leading-relaxed" style={{ color: '#5b6472' }}>{check.message}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <details className="mt-6">
            <summary className="cursor-pointer text-xs uppercase tracking-widest py-2"
                     style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>
              View raw NIfTI header
            </summary>
            <pre className="mt-2 p-4 font-mono text-xs overflow-auto"
                 style={{ background: '#0a0c10', border: '1px solid #1f242c', color: '#d1d5db' }}>
              {JSON.stringify(metadata, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}

// ============ MAIN EXPORT (renders as section content, no wrapper) ============

export default function PreprocessingDemoSection() {
  return (
    <>
      <p className="text-sm leading-relaxed mb-8 max-w-3xl" style={{ color: '#8b94a3' }}>
        A scan from a hospital scanner cannot be passed directly to the BrainIAC foundation model.
        It needs to be standardized first. Below we show the preprocessing pipeline step by step,
        then let you check your own scan in the browser.
      </p>
      <PipelineDiagram />
      <InputRequirements />
      <Walkthrough />
      <ScanChecker />
    </>
  );
}
