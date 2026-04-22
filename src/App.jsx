import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  ArrowUpRight, Github, FileText, Download, Copy, Check,
  Layers, Shield, Database, Zap, Quote, X, Maximize2, Eye, Globe, Table, ChevronRight,
} from 'lucide-react';

// ============ DATA ============

const MODELS = {
  BrainIAC: { color: '#2dd4bf', label: 'BrainIAC' },
  BrainSegFounder: { color: '#f97316', label: 'BrainSegFounder' },
  MedicalNet: { color: '#818cf8', label: 'MedicalNet' },
  Scratch: { color: '#ec4899', label: 'Scratch' },
};

// All values below are sourced directly from the Nature Neuroscience
// Supplementary Data Tables 9, 10, 13, 17, 20, 22, 24, 26 (main curves),
// Tables 11, 14, 19, 21, 23, 25, 27 (few-shot), and Tables 28-34 (linear probe).
const TASKS = [
  {
    id: 'sequence',
    name: 'Sequence Classification',
    metric: 'Balanced Accuracy',
    metricShort: 'BA',
    higherBetter: true,
    description: 'Assign correct MRI sequence label (T1, T2, T1CE, FLAIR) to each 3D brain volume.',
    detail: 'Critical upstream step for MRI curation. Evaluated on 876 held-out BraTS 2023 scans.',
    ntest: 876, ntrain: 5004, dataset: 'BraTS 2023',
    // Supp Table 24
    data: [
      { pct: '10%', BrainIAC: 0.909, BrainSegFounder: 0.864, MedicalNet: 0.742, Scratch: 0.790 },
      { pct: '20%', BrainIAC: 0.945, BrainSegFounder: 0.929, MedicalNet: 0.850, Scratch: 0.848 },
      { pct: '40%', BrainIAC: 0.953, BrainSegFounder: 0.947, MedicalNet: 0.896, Scratch: 0.944 },
      { pct: '60%', BrainIAC: 0.973, BrainSegFounder: 0.955, MedicalNet: 0.930, Scratch: 0.953 },
      { pct: '80%', BrainIAC: 0.973, BrainSegFounder: 0.959, MedicalNet: 0.951, Scratch: 0.970 },
      { pct: '100%', BrainIAC: 0.971, BrainSegFounder: 0.960, MedicalNet: 0.951, Scratch: 0.963 },
    ],
    // Supp Table 25
    fewShot: {
      K1: { BrainIAC: 0.538, BrainSegFounder: 0.348, MedicalNet: 0.250, Scratch: 0.342 },
      K5: { BrainIAC: 0.732, BrainSegFounder: 0.405, MedicalNet: 0.491, Scratch: 0.438 },
    },
    // Supp Table 33
    linearProbe: { BrainIAC: 0.758, BrainSegFounder: 0.425, MedicalNet: 0.402 },
  },
  {
    id: 'brainage',
    name: 'Brain Age Prediction',
    metric: 'MAE (years)',
    metricShort: 'MAE',
    higherBetter: false,
    description: 'Predict biological brain age from T1-weighted MRI scans: a potential early biomarker for neurological disease.',
    detail: 'External (out-of-distribution) test cohort of 1,072 scans. Lower is better.',
    ntest: 1072, ntrain: 3882, dataset: 'Multi-site · external test',
    // Supp Table 10 (external test)
    data: [
      { pct: '10%', BrainIAC: 8.10, BrainSegFounder: 10.96, MedicalNet: 8.18, Scratch: 12.31 },
      { pct: '20%', BrainIAC: 6.55, BrainSegFounder: 10.08, MedicalNet: 7.62, Scratch: 7.30 },
      { pct: '40%', BrainIAC: 4.28, BrainSegFounder: 9.64, MedicalNet: 5.29, Scratch: 4.97 },
      { pct: '60%', BrainIAC: 3.85, BrainSegFounder: 7.05, MedicalNet: 4.85, Scratch: 4.62 },
      { pct: '80%', BrainIAC: 4.08, BrainSegFounder: 7.26, MedicalNet: 5.97, Scratch: 4.44 },
      { pct: '100%', BrainIAC: 4.38, BrainSegFounder: 5.66, MedicalNet: 5.86, Scratch: 5.16 },
    ],
    // Supp Table 11 (external few-shot)
    fewShot: {
      K1: { BrainIAC: 9.45, BrainSegFounder: 10.97, MedicalNet: 17.05, Scratch: 16.93 },
      K5: { BrainIAC: 7.24, BrainSegFounder: 10.24, MedicalNet: 15.03, Scratch: 14.29 },
    },
    // Supp Table 28
    linearProbe: { BrainIAC: 7.51, BrainSegFounder: 10.45, MedicalNet: 7.90 },
  },
  {
    id: 'mutation',
    name: 'IDH Mutation Prediction',
    metric: 'AUC',
    metricShort: 'AUC',
    higherBetter: true,
    description: 'Noninvasively predict IDH mutational status in low-grade glioma from brain MRI.',
    detail: '99 held-out scans from UCSF-PDGM dataset. Higher is better.',
    ntest: 99, ntrain: 396, dataset: 'UCSF-PDGM',
    // Supp Table 13
    data: [
      { pct: '10%', BrainIAC: 0.689, BrainSegFounder: 0.593, MedicalNet: 0.497, Scratch: 0.479 },
      { pct: '20%', BrainIAC: 0.632, BrainSegFounder: 0.612, MedicalNet: 0.635, Scratch: 0.557 },
      { pct: '40%', BrainIAC: 0.758, BrainSegFounder: 0.559, MedicalNet: 0.640, Scratch: 0.609 },
      { pct: '60%', BrainIAC: 0.812, BrainSegFounder: 0.560, MedicalNet: 0.746, Scratch: 0.435 },
      { pct: '80%', BrainIAC: 0.793, BrainSegFounder: 0.479, MedicalNet: 0.713, Scratch: 0.413 },
      { pct: '100%', BrainIAC: 0.798, BrainSegFounder: 0.594, MedicalNet: 0.687, Scratch: 0.610 },
    ],
    // Supp Table 14
    fewShot: {
      K1: { BrainIAC: 0.648, BrainSegFounder: 0.578, MedicalNet: 0.369, Scratch: 0.488 },
      K5: { BrainIAC: 0.647, BrainSegFounder: 0.624, MedicalNet: 0.438, Scratch: 0.557 },
    },
    // Supp Table 29
    linearProbe: { BrainIAC: 0.688, BrainSegFounder: 0.606, MedicalNet: 0.582 },
  },
  {
    id: 'survival',
    name: 'Overall Survival',
    metric: 'AUC',
    metricShort: 'AUC',
    higherBetter: true,
    description: 'Predict 1-year post-treatment survival in glioblastoma patients from baseline MRI.',
    detail: 'Internal test set (UPENN-GBM), 134 patients.',
    ntest: 134, ntrain: 545, dataset: 'UPENN-GBM / TCGA-GBM',
    // Supp Table 17 (internal test)
    data: [
      { pct: '10%', BrainIAC: 0.623, BrainSegFounder: 0.543, MedicalNet: 0.368, Scratch: 0.522 },
      { pct: '20%', BrainIAC: 0.616, BrainSegFounder: 0.527, MedicalNet: 0.434, Scratch: 0.550 },
      { pct: '40%', BrainIAC: 0.669, BrainSegFounder: 0.475, MedicalNet: 0.346, Scratch: 0.355 },
      { pct: '60%', BrainIAC: 0.702, BrainSegFounder: 0.531, MedicalNet: 0.493, Scratch: 0.427 },
      { pct: '80%', BrainIAC: 0.694, BrainSegFounder: 0.441, MedicalNet: 0.572, Scratch: 0.462 },
      { pct: '100%', BrainIAC: 0.723, BrainSegFounder: 0.548, MedicalNet: 0.537, Scratch: 0.478 },
    ],
    // Supp Table 19 (external few-shot; paper's narrative uses external)
    fewShot: {
      K1: { BrainIAC: 0.593, BrainSegFounder: 0.425, MedicalNet: 0.383, Scratch: 0.371 },
      K5: { BrainIAC: 0.610, BrainSegFounder: 0.581, MedicalNet: 0.560, Scratch: 0.488 },
    },
    // Supp Table 30
    linearProbe: { BrainIAC: 0.643, BrainSegFounder: 0.533, MedicalNet: 0.542 },
  },
  {
    id: 'mci',
    name: 'MCI Classification',
    metric: 'AUC',
    metricShort: 'AUC',
    higherBetter: true,
    description: "Distinguish mild cognitive impairment from healthy controls: an early marker for Alzheimer's.",
    detail: '40 held-out scans from OASIS-1. Higher is better.',
    ntest: 40, ntrain: 195, dataset: 'OASIS-1',
    // Supp Table 20
    data: [
      { pct: '10%', BrainIAC: 0.702, BrainSegFounder: 0.530, MedicalNet: 0.564, Scratch: 0.542 },
      { pct: '20%', BrainIAC: 0.759, BrainSegFounder: 0.489, MedicalNet: 0.583, Scratch: 0.702 },
      { pct: '40%', BrainIAC: 0.771, BrainSegFounder: 0.533, MedicalNet: 0.657, Scratch: 0.621 },
      { pct: '60%', BrainIAC: 0.784, BrainSegFounder: 0.580, MedicalNet: 0.745, Scratch: 0.492 },
      { pct: '80%', BrainIAC: 0.831, BrainSegFounder: 0.583, MedicalNet: 0.774, Scratch: 0.796 },
      { pct: '100%', BrainIAC: 0.884, BrainSegFounder: 0.621, MedicalNet: 0.821, Scratch: 0.774 },
    ],
    // Supp Table 21
    fewShot: {
      K1: { BrainIAC: 0.696, BrainSegFounder: 0.605, MedicalNet: 0.558, Scratch: 0.495 },
      K5: { BrainIAC: 0.799, BrainSegFounder: 0.533, MedicalNet: 0.636, Scratch: 0.517 },
    },
    // Supp Table 31
    linearProbe: { BrainIAC: 0.721, BrainSegFounder: 0.473, MedicalNet: 0.470 },
  },
  {
    id: 'stroke',
    name: 'Time-to-Stroke',
    metric: 'MAE (days)',
    metricShort: 'MAE',
    higherBetter: false,
    description: 'Predict days since stroke onset from structural MRI. Informs treatment eligibility for uncertain-onset cases.',
    detail: 'ATLAS dataset, 40 held-out patients. Lower is better.',
    ntest: 40, ntrain: 170, dataset: 'ATLAS',
    // Supp Table 22
    data: [
      { pct: '10%', BrainIAC: 61.56, BrainSegFounder: 77.32, MedicalNet: 67.32, Scratch: 64.78 },
      { pct: '20%', BrainIAC: 60.95, BrainSegFounder: 75.30, MedicalNet: 71.95, Scratch: 63.28 },
      { pct: '40%', BrainIAC: 54.12, BrainSegFounder: 64.63, MedicalNet: 63.70, Scratch: 64.95 },
      { pct: '60%', BrainIAC: 44.38, BrainSegFounder: 63.74, MedicalNet: 62.83, Scratch: 59.41 },
      { pct: '80%', BrainIAC: 44.88, BrainSegFounder: 63.74, MedicalNet: 62.40, Scratch: 63.64 },
      { pct: '100%', BrainIAC: 38.87, BrainSegFounder: 63.74, MedicalNet: 62.24, Scratch: 50.63 },
    ],
    // Supp Table 23
    fewShot: {
      K1: { BrainIAC: 66.11, BrainSegFounder: 75.99, MedicalNet: 85.98, Scratch: 83.98 },
      K5: { BrainIAC: 69.47, BrainSegFounder: 65.15, MedicalNet: 85.16, Scratch: 65.64 },
    },
    // Supp Table 32
    linearProbe: { BrainIAC: 64.31, BrainSegFounder: 72.60, MedicalNet: 74.70 },
  },
  {
    id: 'segmentation',
    name: 'Tumor Segmentation',
    metric: 'Dice',
    metricShort: 'Dice',
    higherBetter: true,
    description: 'Delineate adult glioma tumors from FLAIR sequences, essential for treatment planning.',
    detail: 'BraTS 2023 adult glioma, 144 held-out scans. Higher is better.',
    ntest: 144, ntrain: 1206, dataset: 'BraTS 2023',
    // Inline figure next to the task's chart.
    figure: { src: './figures/fig4d-segmentation.jpg', caption: 'Predicted tumor segmentations (red overlay) across K=1, K=5, 10%, 100% training regimes.' },
    // Supp Table 26
    data: [
      { pct: '10%', BrainIAC: 0.724, BrainSegFounder: 0.713, MedicalNet: 0.549, Scratch: 0.336 },
      { pct: '20%', BrainIAC: 0.770, BrainSegFounder: 0.728, MedicalNet: 0.549, Scratch: 0.379 },
      { pct: '40%', BrainIAC: 0.771, BrainSegFounder: 0.691, MedicalNet: 0.549, Scratch: 0.476 },
      { pct: '60%', BrainIAC: 0.786, BrainSegFounder: 0.709, MedicalNet: 0.661, Scratch: 0.661 },
      { pct: '80%', BrainIAC: 0.786, BrainSegFounder: 0.741, MedicalNet: 0.661, Scratch: 0.691 },
      { pct: '100%', BrainIAC: 0.795, BrainSegFounder: 0.756, MedicalNet: 0.691, Scratch: 0.709 },
    ],
    // Supp Table 27
    fewShot: {
      K1: { BrainIAC: 0.518, BrainSegFounder: 0.500, MedicalNet: 0.136, Scratch: 0.035 },
      K5: { BrainIAC: 0.616, BrainSegFounder: 0.537, MedicalNet: 0.518, Scratch: 0.137 },
    },
    // Supp Table 34
    linearProbe: { BrainIAC: 0.671, BrainSegFounder: 0.646, MedicalNet: 0.578 },
  },
];

// Real per-dataset scan counts from Supplementary Data Table 1.
// Grand total sums exactly to 48,965 scans. Two earlier typos corrected:
// HIMH → NIMH (National Institute of Mental Health) and DLMS → DLBS (Dallas
// Lifespan Brain Study). OASIS-1 (MCI task) and ATLAS (stroke task) added
// from Supp Table 1 to account for the full 48,965-scan corpus.
const DATASETS = [
  { name: 'ABCD', condition: 'Healthy', scans: 7197 },
  { name: 'BRATS23', condition: 'GBM', scans: 5880 },
  { name: 'OASIS-3', condition: "Alzheimer's", scans: 4874 },
  { name: 'ADNI', condition: "Alzheimer's", scans: 4825 },
  { name: 'DFCI/BCH LGG', condition: 'PLGG', scans: 4245 },
  { name: 'SOOP', condition: 'Stroke', scans: 3430 },
  { name: 'UPENN-GBM', condition: 'GBM', scans: 2520 },
  { name: 'MCSA', condition: 'Dementia', scans: 2303 },
  { name: 'CBTN LGG', condition: 'PLGG', scans: 1541 },
  { name: 'ABIDE', condition: 'Autism', scans: 1099 },
  { name: 'wu1200', condition: 'Healthy', scans: 1096 },
  { name: 'UCSF-PDGM', condition: 'Diffuse glioma', scans: 990 },
  { name: 'AOMIC', condition: 'Healthy', scans: 928 },
  { name: 'NIMH', condition: 'Healthy', scans: 923 },
  { name: 'ICBM', condition: 'Healthy', scans: 809 },
  { name: 'PING', condition: 'Healthy', scans: 738 },
  { name: 'DLBS', condition: 'Healthy', scans: 670 },
  { name: 'PPMI', condition: "Parkinson's", scans: 547 },
  { name: 'MIRIAD', condition: "Alzheimer's", scans: 523 },
  { name: 'ABCDV2', condition: 'Healthy', scans: 500 },
  { name: 'Calgary', condition: 'Healthy', scans: 345 },
  { name: 'HAN', condition: 'Healthy', scans: 318 },
  { name: 'LONG579', condition: 'Healthy', scans: 285 },
  { name: 'BABY', condition: 'Healthy', scans: 284 },
  { name: 'Petfrog', condition: 'Healthy', scans: 268 },
  { name: 'ATLAS', condition: 'Stroke', scans: 235 },
  { name: 'RadART', condition: 'PLGG', scans: 213 },
  { name: 'OASIS-1', condition: 'Dementia', scans: 211 },
  { name: 'OASIS-2', condition: 'Dementia', scans: 211 },
  { name: 'DFCI/BCH HGG', condition: 'HGG', scans: 200 },
  { name: 'SALD', condition: 'Healthy', scans: 181 },
  { name: 'IXI', condition: 'Healthy', scans: 155 },
  { name: 'NYU', condition: 'Healthy', scans: 152 },
  { name: 'Pixar', condition: 'Healthy', scans: 132 },
  { name: 'QIN-GBM', condition: 'GBM', scans: 99 },
  { name: 'RIDER', condition: 'GBM', scans: 38 },
];

const CONDITION_COLORS = {
  "Alzheimer's": '#3b82f6', Autism: '#8b5cf6', Dementia: '#a855f7',
  'Diffuse glioma': '#ec4899', GBM: '#f43f5e', Healthy: '#64748b',
  HGG: '#ef4444', "Parkinson's": '#f97316', PLGG: '#eab308', Stroke: '#f59e0b',
};

const ROBUSTNESS_DATA = {
  contrast: {
    title: 'Contrast Perturbation',
    description: 'Simulates scanner contrast variability (scale 0.5 – 2.0)',
    unit: 'Contrast scale',
    data: [
      { scale: '0.5', BrainIAC: 0.72, BrainSegFounder: 0.60, MedicalNet: 0.68, Scratch: 0.58 },
      { scale: '0.75', BrainIAC: 0.73, BrainSegFounder: 0.60, MedicalNet: 0.69, Scratch: 0.58 },
      { scale: '1.0', BrainIAC: 0.73, BrainSegFounder: 0.59, MedicalNet: 0.66, Scratch: 0.55 },
      { scale: '1.25', BrainIAC: 0.72, BrainSegFounder: 0.58, MedicalNet: 0.64, Scratch: 0.52 },
      { scale: '1.5', BrainIAC: 0.71, BrainSegFounder: 0.57, MedicalNet: 0.60, Scratch: 0.49 },
      { scale: '1.75', BrainIAC: 0.70, BrainSegFounder: 0.55, MedicalNet: 0.55, Scratch: 0.48 },
      { scale: '2.0', BrainIAC: 0.68, BrainSegFounder: 0.52, MedicalNet: 0.50, Scratch: 0.48 },
    ],
  },
  gibbs: {
    title: 'Gibbs Ringing Artifact',
    description: 'Simulates k-space truncation artifacts (scale 0.0 – 0.4)',
    unit: 'Gibbs scale',
    data: [
      { scale: '0.0', BrainIAC: 0.73, BrainSegFounder: 0.59, MedicalNet: 0.66, Scratch: 0.55 },
      { scale: '0.1', BrainIAC: 0.73, BrainSegFounder: 0.58, MedicalNet: 0.64, Scratch: 0.54 },
      { scale: '0.2', BrainIAC: 0.72, BrainSegFounder: 0.57, MedicalNet: 0.60, Scratch: 0.52 },
      { scale: '0.3', BrainIAC: 0.71, BrainSegFounder: 0.55, MedicalNet: 0.55, Scratch: 0.50 },
      { scale: '0.4', BrainIAC: 0.70, BrainSegFounder: 0.53, MedicalNet: 0.50, Scratch: 0.48 },
    ],
  },
  bias: {
    title: 'Bias Field Distortion',
    description: 'Simulates low-frequency intensity nonuniformity (scale 0.0 – 0.4)',
    unit: 'Bias scale',
    data: [
      { scale: '0.0', BrainIAC: 0.73, BrainSegFounder: 0.59, MedicalNet: 0.66, Scratch: 0.55 },
      { scale: '0.1', BrainIAC: 0.72, BrainSegFounder: 0.57, MedicalNet: 0.64, Scratch: 0.54 },
      { scale: '0.2', BrainIAC: 0.71, BrainSegFounder: 0.55, MedicalNet: 0.58, Scratch: 0.52 },
      { scale: '0.3', BrainIAC: 0.70, BrainSegFounder: 0.54, MedicalNet: 0.54, Scratch: 0.50 },
      { scale: '0.4', BrainIAC: 0.68, BrainSegFounder: 0.52, MedicalNet: 0.50, Scratch: 0.48 },
    ],
  },
};

// Paper figures used in the gallery and saliency sections.
// High-resolution WebP versions from Nature Neuroscience.
const PAPER_FIGURES = [
  {
    id: 'fig1',
    src: './figures/fig1-full.webp',
    label: 'Fig. 1',
    title: 'Study overview: datasets, SSL pipeline, downstream overview',
    caption: '(a) 34 datasets across 10 conditions totaling 48,965 scans. (b) SimCLR contrastive pretraining on cropped 3D patches. (c) Few-shot and linear probe summary radar charts across five (left) and all seven (right) downstream tasks.',
  },
  {
    id: 'fig2',
    src: './figures/fig2-full.webp',
    label: 'Fig. 2',
    title: 'Performance across seven tasks',
    caption: 'Each panel shows one task across six training data fractions (10% → 100%). BrainIAC dominates at low data availability, with gaps narrowing at 100%. Mean ± 95% CI from 1,000 bootstrap samples.',
  },
  {
    id: 'fig3',
    src: './figures/fig3-full.webp',
    label: 'Fig. 3',
    title: 'Few-shot adaptation and linear probe',
    caption: '(a–g) Performance with K=1 or K=5 labeled samples per class. (h) Linear probe (frozen encoder) performance across all seven tasks. BrainIAC maintains meaningful performance where others collapse to chance.',
  },
  {
    id: 'fig4',
    src: './figures/fig4-full.webp',
    label: 'Fig. 4',
    title: 'Kaplan-Meier survival curves & tumor segmentation',
    caption: 'Risk-stratified survival curves at 10/40/80/100% training data. (a) internal test, (b) external test, (c) frozen encoder. (d) Tumor segmentation overlays at K=1, K=5, 10%, 100%.',
  },
  {
    id: 'fig5',
    src: './figures/fig5-full.webp',
    label: 'Fig. 5',
    title: 'Perturbation stability matrix',
    caption: 'Seven tasks (rows) × three artifact types (columns: contrast 0.5–2.0, Gibbs 0.0–0.4, bias 0.0–0.4). Green BrainIAC lines stay flat; other models wander as perturbation intensity increases.',
  },
  {
    id: 'fig6',
    src: './figures/fig6-full.webp',
    label: 'Fig. 6',
    title: 'Brain age prediction scatter & t-SNE',
    caption: '(a, c) Predicted vs. chronological age regressions for internal and external test sets. (b, d) t-SNE projections of BrainIAC latent features cluster cleanly by age bin (0-10, 10-20, 20-30, 30-40 years).',
  },
  {
    id: 'fig7',
    src: './figures/fig7-full.webp',
    label: 'Fig. 7',
    title: 'Saliency maps across tasks',
    caption: '(a) Frozen BrainIAC backbone attention across four sequences (T2FLAIR, T1w, T2w, T1ce), with no task-specific training. (b) Task-specific saliency after fine-tuning: hippocampus for MCI, tumor cores for IDH and survival, periventricular regions for brain age.',
  },
];

// Mindmap data for the interactive concept explorer
const MINDMAP = {
  id: 'root',
  label: 'BrainIAC Foundation Model',
  content:
    "BrainIAC (Brain Imaging Adaptive Core) is the first self-supervised foundation model purpose-built for 3D brain MRI analysis. Presented in Nature Neuroscience (Tak, Garomsa, Zapaishchykova et al., April 2026, Volume 29, pages 945 to 956), it addresses a core bottleneck in medical AI: the scarcity of expertly annotated brain imaging datasets. Rather than training a task-specific model from scratch for each clinical problem, BrainIAC learns a single generalized encoder from 32,015 unlabeled brain MRI scans using contrastive self-supervised learning (SimCLR), then adapts to seven diverse downstream tasks through minimal fine-tuning. It was validated on 48,965 brain MRI scans spanning 10 neurological conditions, from healthy brains to glioblastoma, Alzheimer's disease, and pediatric gliomas. BrainIAC consistently outperforms traditional supervised training and domain-specific pretrained baselines (MedicalNet, BrainSegFounder), particularly in low-data and few-shot settings. The model was developed at the Mass General Brigham AIM Program (Harvard Medical School) with corresponding author Benjamin H. Kann, MD. Code, weights, and an interactive web platform are publicly available. Click any branch to explore the model's architecture, training corpus, clinical applications, and performance characteristics in detail.",
  children: [
    {
      id: 'core-tech',
      label: 'Core Technology',
      content:
        "BrainIAC's technical foundation rests on four complementary design choices that together solve the brain MRI generalization problem. First, self-supervised learning (SSL) replaces task-specific supervised training, allowing the model to learn from the enormous volume of unlabeled brain MRI available in the world. Second, the SimCLR contrastive objective provides the specific mechanism for learning: by pulling augmented views of the same scan together and pushing different scans apart in latent space, the encoder learns anatomy-aware spatial representations without any labels. Third, a 3D Vision Transformer-Base (ViT-B) backbone was chosen after systematic benchmarking against convolutional (ResNet50) and masked-autoencoder (MAE-SwinViT) alternatives, because the transformer's attention mechanism better captures the long-range spatial relationships in volumetric brain data. Fourth, a carefully curated pool of 32,015 unlabeled, skull-stripped, bias-corrected brain MRI scans spanning multiple ages, scanners, and conditions fuels the pretraining step. Together, these choices produce a single generalized vision encoder that adapts to seven diverse downstream clinical tasks with minimal additional training data.",
      children: [
        {
          id: 'ssl',
          label: 'Self-Supervised Learning (SSL)',
          content:
            "Self-supervised learning (SSL) lets BrainIAC learn meaningful representations from unlabeled MRI data. This sidesteps the main bottleneck in medical AI: the scarcity of expertly annotated brain imaging datasets, particularly for rare diseases and cases involving expensive data acquisition procedures. SSL approaches solve a 'pretext task' that requires no manual labels, such as predicting whether two image patches come from the same underlying volume. After pretraining, the learned features transfer to many downstream tasks with only limited labeled data needed for fine-tuning. SSL has revolutionized computer vision and natural language processing (BERT, GPT), and has shown strong results in medical imaging domains like digital pathology and chest X-ray interpretation. BrainIAC is the first major SSL foundation model for 3D brain MRI that rigorously evaluates across classification, regression, and segmentation tasks together. The paper demonstrates that SSL pretraining provides particularly large gains when labeled data is scarce (below 10% of the full training set) or the task is intrinsically difficult (such as predicting tumor mutations from imaging alone).",
        },
        {
          id: 'simclr',
          label: 'Contrastive Learning (SimCLR)',
          content:
            "BrainIAC uses SimCLR (Chen et al., ICML 2020) with a normalized temperature-scaled cross-entropy (NT-Xent) loss over augmented 3D patches. The procedure works as follows: each training iteration samples a batch of 3D brain MRI scans, generates two randomly augmented views of each scan (random crops, Gaussian blur and noise, affine transformations, intensity shifts), and passes them through the ViT-B encoder followed by a projection head. The NT-Xent loss then maximizes cosine similarity between the two views of the same scan (a positive pair) while minimizing similarity to views from all other scans in the batch (negatives). Pretraining ran for 200 epochs with a batch size of 32 on a single NVIDIA A6000 GPU, requiring approximately 72 hours. Input volumes were standardized to 128x128x128 voxels at 1mm isotropic spacing. The contrastive framework forces the encoder to learn generalizable anatomy-aware features because the only way to match augmented views is to understand what is invariant about the underlying anatomy.",
        },
        {
          id: 'vit-b',
          label: '3D ViT-B Backbone',
          content:
            "A 3D Vision Transformer-Base (ViT-B) with 50 convolutional layers and 2 fully-connected layers, totaling approximately 52.5 million parameters and a 1024-dimensional latent representation. The paper systematically benchmarked three candidate encoders under few-shot adaptation (K=1 and K=5 per class) across all seven downstream tasks before committing to ViT-B: (1) SimCLR-ResNet50, a convolutional baseline using the same SimCLR objective; (2) SimCLR-ViT-B 3D, the selected architecture; and (3) MAE-SwinViT, a masked autoencoder variant of the Swin Transformer. The ViT-B configuration demonstrated consistent superior performance across this benchmark (Extended Data Fig. 2), particularly on tasks requiring long-range spatial reasoning like survival prediction and tumor segmentation. The paper hypothesizes that ViT's attention mechanism, trained with SimCLR's contrastive objective, produces more generalizable feature representations than either convolutional networks (limited receptive fields) or reconstruction-based encoders (focus on low-level pixel detail rather than semantic structure).",
        },
        {
          id: 'unlabeled-data',
          label: 'Unlabeled Brain MRI Data',
          content:
            "The SSL pretraining step uses 32,015 preprocessed brain MRI scans pooled from 16 source datasets. No labels are required; the model learns purely from the image content itself. Every scan passes through a systematic preprocessing pipeline: (1) raw DICOM files converted to NIFTI format using dcm2nii; (2) N4 bias field correction applied via SimpleITK to remove low-frequency intensity nonuniformity; (3) all scans resampled to isotropic 1x1x1 mm voxels via linear interpolation; (4) rigid registration to MNI space brain atlas; and (5) brain extraction and skull stripping using the HD-BET package. All scans were acquired at clinical field strengths of 1.5T or 3T. The 32,015 pretraining scans include 4 sequence types (T1-weighted, T2-weighted, T1-weighted with contrast enhancement, and FLAIR) and span diverse demographics from pediatric to elderly adults. The remaining approximately 17,000 scans from the full 48,965-scan corpus are held back for task-specific fine-tuning and held-out test sets, avoiding any leakage between pretraining and downstream evaluation.",
        },
      ],
    },
    {
      id: 'training',
      label: 'Training & Validation',
      content:
        "BrainIAC was trained and validated on one of the largest and most diverse brain MRI corpora ever assembled for deep learning: 48,965 scans across 36 datasets spanning 10 neurological conditions. This scale and heterogeneity is essential. A foundation model needs to see heterogeneous scanners, acquisition protocols, patient ages (from infants to elderly), and pathologies to learn representations that generalize beyond any single dataset. The paper partitions this corpus intentionally: 32,015 scans are used for SSL pretraining (unlabeled), and the remaining scans form task-specific training, validation, and held-out test sets for each of the seven downstream applications. Pretraining data comes from 16 public and private sources including ABCD (adolescent brain cognitive development), ADNI (Alzheimer's), BraTS 2023 (brain tumor segmentation), UPENN-GBM (glioblastoma), OASIS 1/2/3 (aging), and more. External test sets from completely separate institutions were used to verify that the model's performance generalizes outside its training distribution.",
      children: [
        {
          id: 'total-scans',
          label: '48,965 Brain MRI Scans',
          content:
            "The full corpus comprises 48,965 brain MRI scans with the following sequence breakdown: 24,504 T1-weighted (T1W, the most common structural sequence), 15,372 T2-FLAIR (fluid-attenuated inversion recovery, used for lesion detection), 5,389 T2-weighted (T2W, used for edema and lesion visualization), and 3,254 T1-weighted with gadolinium contrast enhancement (T1CE, used for tumor and vascular assessment). All scanners operated at clinical field strengths of 1.5T or 3T; ultra-high field (7T) and low-field scans were excluded. Patient age ranges span from approximately 2 years (NIMH, ADNI pediatric subsets) to 96 years (OASIS-2, MCSA), covering virtually the entire human lifespan relevant to neurological disease. This breadth of sequences and demographics is what enables BrainIAC's single encoder to work across tasks as different as pediatric glioma detection, adult brain age estimation, and geriatric Alzheimer's screening.",
        },
        {
          id: 'pretrain-scans',
          label: '32,015 Pretraining Scans',
          content:
            "The SSL pretraining subset of 32,015 scans is sourced from 16 datasets (the first 16 rows of Supplementary Table 4). The breakdown by dataset shows ABCD contributing the largest share (7,197 scans), followed by ADNI (4,825), OASIS-3 (4,874), DFCI/BCH LGG (4,245), BRATS23 (5,880), and smaller contributions from 11 other sources. The remaining approximately 17,000 scans from the full 48,965-scan corpus are held back as task-specific fine-tuning and held-out test sets, avoiding any leakage between pretraining and downstream evaluation. This strict separation is critical for scientific validity: if a scan was used to pretrain the model, it cannot later appear in a test set without inflating the reported performance. The pretraining corpus mixes healthy controls with diverse pathologies, which is intentional: the paper argues that exposure to both normal and abnormal anatomy during pretraining produces a more robust encoder than training on healthy data alone.",
        },
        {
          id: 'diverse-datasets',
          label: '36 Diverse Datasets',
          content:
            "The corpus is drawn from a wide range of data sources, mixing publicly available research datasets with private clinical collections. Public datasets include ABCD and ABCDV2 (adolescent brain cognitive development), ADNI (Alzheimer's disease neuroimaging initiative), OASIS-1, OASIS-2, and OASIS-3 (open access series of imaging studies for aging and dementia), BraTS 2023 (brain tumor segmentation challenge 2023), UCSF-PDGM (diffuse glioma), UPENN-GBM and QIN-GBM (glioblastoma), ATLAS (stroke), ABIDE (autism), PPMI (Parkinson's), MIRIAD (Alzheimer's), CBTN LGG (pediatric low-grade glioma), and many more. Two private hospital collections are also included: DFCI/BCH LGG (Dana-Farber/Boston Children's low-grade glioma) and DFCI/BCH HGG (high-grade glioma), plus the RadART study on radiation-induced arteriopathy. The paper reports '34 datasets' in Figure 1a's caption; Supplementary Table 1 enumerates 36 total when including OASIS-1 (added for the MCI task) and ATLAS (added for the time-to-stroke task), which together account for the additional 446 scans needed to reach the full 48,965 total.",
        },
        {
          id: 'conditions',
          label: '10 Medical Conditions',
          content:
            "The 48,965 scans are distributed across 10 neurological conditions as follows (Reporting Summary, Population section): Healthy (14,981 scans, 30.6% of the corpus), Alzheimer's disease and related cognitive decline (10,222 scans, 20.9%), glioblastoma multiforme or GBM (8,537, 17.4%), pediatric low-grade glioma or PLGG (5,999, 12.2%), Stroke (3,641, 7.4%), Dementia (2,749, 5.6%), Autism spectrum disorder (1,099, 2.2%), Diffuse glioma (990, 2.0%), Parkinson's disease (547, 1.1%), and high-grade glioma or HGG (200, 0.4%). This distribution reflects the natural imbalance of available neuroimaging data: healthy controls and common diseases like Alzheimer's and GBM are heavily represented, while rarer entities like HGG are sparse. The mix spans developmental (autism, pediatric gliomas), neurodegenerative (Alzheimer's, Parkinson's, dementia), vascular (stroke), and oncologic (GBM, HGG, diffuse glioma, PLGG) disease settings across pediatric through geriatric populations.",
        },
      ],
    },
    {
      id: 'downstream',
      label: 'Downstream Applications',
      content:
        "Seven clinically meaningful downstream tasks were used to probe BrainIAC's versatility. They were deliberately chosen to span the difficulty spectrum from tasks that are easy for trained clinicians (like identifying which MRI sequence a scan represents) to tasks that are extremely difficult even for experts (like predicting IDH mutation status or survival time from imaging alone). The tasks also span three methodological categories: classification (sequence, IDH, MCI, survival), regression (brain age, time-to-stroke), and dense prediction (tumor segmentation). For each task, BrainIAC was evaluated at six data availability levels (10%, 20%, 40%, 60%, 80%, 100% of the task-specific training data) and in extreme few-shot settings (K=1 and K=5 labeled examples per class), as well as with the backbone frozen (linear probing). This comprehensive evaluation demonstrates that a single pretrained encoder can adapt to fundamentally different clinical problems with minimal task-specific engineering.",
      children: [
        {
          id: 'diagnostics',
          label: 'Clinical Diagnostics',
          content:
            "Three classification tasks that inform clinical decision-making at the point of diagnosis: identifying which MRI sequence a scan represents (a critical preprocessing and curation step), predicting IDH mutation status in low-grade glioma (which guides treatment selection), and distinguishing mild cognitive impairment (MCI) from healthy controls (an early marker for Alzheimer's disease progression). These three tasks span the full difficulty spectrum: sequence classification is trivial for clinicians and provides a sanity check that BrainIAC can handle basic MRI semantics; IDH prediction is notoriously difficult and historically required invasive biopsy; MCI classification lies between these extremes but is clinically important because early detection enables earlier intervention.",
          children: [
            {
              id: 'seq-class',
              label: 'MRI Sequence Classification',
              content:
                "A four-way classification task between T1, T2, T1CE, and FLAIR MRI sequences from the BraTS 2023 dataset. Training data: 5,004 scans (balanced across four classes, roughly 1,250 per class). Held-out test set: 876 scans. Metric: balanced accuracy (BA). At 10% data availability (n=500 training scans), BrainIAC achieved BA of 0.909, versus 0.864 for BrainSegFounder, 0.790 for Scratch, and 0.742 for MedicalNet. Performance plateaued at approximately 97% BA across all models once training data exceeded 60%. In the extreme few-shot regime (K=1, just 4 training samples total across the four classes), BrainIAC still achieved 0.538 BA while MedicalNet collapsed to chance (0.250). Sequence classification is clinically important because missing or incorrect sequence metadata is common in hospital PACS archives and blocks downstream automated analysis pipelines.",
            },
            {
              id: 'idh',
              label: 'IDH Mutation Prediction',
              content:
                "Binary classification of IDH (isocitrate dehydrogenase) mutation versus wildtype in diffuse glioma patients from the UCSF-PDGM dataset. Training data: 396 scans total (392 IDH-wildtype and 103 IDH-mutant across all 495 subjects, 79.9% to 20.1% class imbalance). Held-out test set: 99 scans. Input: two MRI sequences per patient (T1CE and FLAIR), both passed through the encoder and pooled before the classification head. Metric: AUC. At just 10% training data (50 scans), BrainIAC achieved AUC 0.689 versus 0.593 for BrainSegFounder, 0.497 for MedicalNet, and 0.479 for Scratch — a 16.2% relative improvement. At 60% data, BrainIAC peaked at AUC 0.812. This task is considered extremely challenging because IDH mutational status is a molecular genomic feature that does not directly correspond to any obvious imaging marker; clinical diagnosis traditionally requires tissue biopsy. Non-invasive imaging-based prediction could guide treatment planning when biopsy is risky or infeasible.",
            },
            {
              id: 'mci',
              label: 'MCI vs Healthy Control',
              content:
                "Binary classification of mild cognitive impairment (MCI) versus cognitively normal controls using the OASIS-1 dataset. MCI status was defined by Clinical Dementia Rating (CDR) scores of 0.5, 1.0, or 2.0; cognitively normal subjects had CDR of 0. Training data: 195 scans (106 healthy control, 89 MCI). Held-out test: 40 scans (29 healthy control, 11 MCI). Input: single T1-weighted scan per subject. Metric: AUC. At 10% data availability (just 20 training scans), BrainIAC achieved AUC 0.702 versus 0.564 for MedicalNet (a relative improvement of 24.5%, the largest gap in the entire paper). At 100% data, BrainIAC peaked at AUC 0.884. Few-shot K=5 AUC was 0.799 for BrainIAC versus 0.636 for MedicalNet. Early detection of MCI is a clinically critical marker because it represents a potentially reversible or treatable precursor to full Alzheimer's disease progression. Note: saliency maps for this task consistently highlight the hippocampus, which is biologically plausible and matches the known anatomy of early Alzheimer's pathology.",
            },
          ],
        },
        {
          id: 'prognosis',
          label: 'Prognosis & Assessment',
          content:
            "Three regression or binary-classification tasks that quantify disease trajectory rather than simply diagnosing a present condition. Brain age prediction from structural MRI serves as a general-purpose biomarker: a predicted brain age older than chronological age (positive 'brain age gap') has been associated with neurocognitive decline and early Alzheimer's markers across many studies. Overall survival prediction for glioblastoma is a binary classification of whether a patient will survive beyond 1 year post-treatment, using baseline pre-treatment imaging. Time-to-stroke prediction is a regression task estimating days since stroke onset from MRI, which has direct clinical utility: patients with uncertain stroke onset are often excluded from time-sensitive treatments like thrombolysis, and an MRI-based time estimate could expand their treatment eligibility. These three tasks demonstrate BrainIAC's versatility across different metrics (AUC for binary classification, MAE for regression) and different clinical populations (pediatric through geriatric, oncologic and vascular).",
          children: [
            {
              id: 'brainage',
              label: 'Brain Age Prediction',
              content:
                "Regression of biological brain age from T1-weighted scans. Internal test set: 1,295 scans. External (out-of-distribution) test set: 1,072 scans drawn from four completely separate cohorts (ABCD V2, IXI, LONG579, Pixar). Training data: 3,882 scans from 10 internal datasets. Input: single T1W image per subject. Metric: mean absolute error (MAE) in years between predicted and chronological age. On the external test set at 20% training data availability (775 scans), BrainIAC achieved MAE of 6.55 years, compared to 10.08 for BrainSegFounder, 7.62 for MedicalNet, and 7.30 for Scratch. At 100% data, BrainIAC peaked at MAE of 4.38 years external. Few-shot K=5 MAE was 7.24 years for BrainIAC vs 15.03 for MedicalNet (2x worse). The t-SNE projections of BrainIAC latent features cluster cleanly into four age bins (0-10, 10-20, 20-30, 30-40 years) with Davies-Bouldin index of 0.481 (internal) and 0.506 (external), better than all three baselines. Brain age gap has been associated with neurocognitive decline and is a potential early biomarker for Alzheimer's disease.",
            },
            {
              id: 'survival',
              label: 'Overall Survival (GBM)',
              content:
                "Predicting 1-year survival post-treatment for glioblastoma multiforme (GBM) patients from baseline pre-treatment MRI. Internal training/test: UPENN-GBM dataset (668 patients total, 360 survived beyond 1 year). Training: 534 patients (80%). Internal test: 134 patients (20%). External test: 134 patients from TCGA-GBM/BraTS 2023 with complete survival information. Input: four MRI sequences per subject (T1CE, FLAIR, T1, T2) passed through the encoder and pooled. Metric: AUC for binary 1-year survival classification. At 10% training data (55 patients), BrainIAC achieved AUC 0.623 on internal test and 0.593 on external test, significantly surpassing all baselines. At 100% data, BrainIAC peaked at AUC 0.723 internal and 0.664 external. Kaplan-Meier survival curves showed that BrainIAC's risk scores stratified patients into significantly different high-risk and low-risk groups (log-rank P < 0.05) at every data fraction, while the randomly-initialized Scratch baseline failed to achieve significant stratification even at 100% training data.",
            },
            {
              id: 'stroke',
              label: 'Time-to-Stroke Prediction',
              content:
                "Regression of days since stroke onset from T1-weighted MRI, using the ATLAS (Anatomical Tracings of Lesions After Stroke) dataset. Training data: 170 scans. Held-out test: 40 scans. The full cohort of 210 stroke patients had median time-to-stroke of 77 days (interquartile range: 11 to 151 days). Loss function: combination of MSE, MAE, and Huber loss. Metric: MAE in days. At 10% training data (18 scans), BrainIAC achieved MAE of 61.56 days, beating the best baseline (Scratch at 64.78) by 5.0%. At 100% data, BrainIAC peaked at MAE 38.87 days versus MedicalNet 62.24, BrainSegFounder 63.74, and Scratch 50.63 — a 23% improvement over the next-best baseline. Few-shot K=1 MAE was 66.11 days for BrainIAC vs 85.97 for MedicalNet. Clinical context: current stroke treatment guidelines exclude patients with uncertain onset time from time-sensitive interventions like intravenous thrombolysis. An MRI-based time estimator could expand eligibility for treatments that materially change outcomes.",
            },
          ],
        },
        {
          id: 'processing',
          label: 'Image Processing',
          content:
            "Dense prediction tasks where the model outputs a spatial map (one label per voxel) rather than a single label or scalar value per scan. Segmentation is the canonical image processing task in medical imaging and is methodologically distinct from classification or regression: it requires the encoder to preserve spatial information through decoder upsampling rather than pooling it away. Including segmentation in the BrainIAC evaluation is important because it tests whether SSL pretraining benefits dense-prediction tasks as much as classification tasks. The answer from the paper is yes: BrainIAC provides large gains for glioma segmentation, particularly in low-data regimes where randomly-initialized decoders fail to learn meaningful tumor boundaries.",
          children: [
            {
              id: 'segmentation',
              label: 'Adult Glioma Segmentation',
              content:
                "Binary segmentation of glioma tumors on FLAIR sequences from the BraTS 2023 adult glioma dataset. The multi-class tumor labels (NCR/NET, edema, enhancing tumor) were combined into a single binary mask. Training: 936 scans, validation: 270 scans, held-out test: 144 scans. Architecture: BrainIAC's ViT-B backbone integrated into a UNETR decoder architecture. Loss: combined Dice loss and binary cross-entropy. Metric: mean Dice coefficient across the test set. At 10% data availability (120 scans), BrainIAC achieved mean Dice of 0.724 versus 0.713 for BrainSegFounder, 0.549 for MedicalNet, and 0.336 for Scratch — essentially a 2x improvement over random initialization. At 100% data, BrainIAC peaked at Dice 0.795. Few-shot K=1 Dice (trained on a single scan) was 0.518 for BrainIAC and 0.035 for Scratch (which fails essentially completely). K=5 Dice was 0.616 for BrainIAC. Qualitative inspection of the predicted segmentations (Figure 4d) shows more precise tumor boundary delineation and fewer false positives in healthy tissue as training data increases.",
            },
          ],
        },
      ],
    },
    {
      id: 'advantages',
      label: 'Performance Advantages',
      content:
        "Where BrainIAC meaningfully outperforms alternatives. The headline result from the paper is that BrainIAC shines precisely in the conditions that most limit clinical AI deployment today: scarce labeled data, high-difficulty prediction tasks, and noisy or perturbed imaging inputs. In real clinical settings, labeled data is expensive (requires radiologist time), frequently unavailable for rare diseases, and often noisy due to scanner variability. A model that requires thousands of labeled examples and fails at test time when the scanner changes is not deployable. BrainIAC's performance profile inverts this: it performs well in the 1-to-50 labeled example regime, handles intrinsically difficult tasks like IDH mutation and survival prediction, and maintains stable output under realistic scanner perturbations. At full data with easy tasks (for example, sequence classification with 5,000 training scans), BrainIAC's advantage narrows because all methods plateau; it is the low-data and hard-task corners of the space where BrainIAC's foundation model approach pays off most.",
      children: [
        {
          id: 'few-shot',
          label: 'Low-Data / Few-Shot (K=1, K=5)',
          content:
            "With just 1 or 5 labeled samples per class (K=1 and K=5), BrainIAC retains meaningful performance where supervised baselines collapse toward chance. Concrete examples from Supplementary Tables 11, 14, 19, 21, 23, 25, 27: sequence classification K=1 (4 total training scans across 4 classes): BrainIAC BA 0.538 vs MedicalNet 0.250 (chance-level for 4-way); MCI classification K=1 (2 training scans total): BrainIAC AUC 0.696 vs Scratch 0.495 (near chance); tumor segmentation K=1 (single training scan): BrainIAC Dice 0.518 vs Scratch 0.035 (essentially zero). For K=5 few-shot: sequence classification K=5 (20 scans total): BrainIAC BA 0.732 vs MedicalNet 0.491; tumor segmentation K=5 (5 scans total): BrainIAC Dice 0.616 vs Scratch 0.137. These margins matter clinically because rare-disease classification and pilot studies often have exactly this few-sample regime, and traditional supervised deep learning is simply non-viable there.",
        },
        {
          id: 'hard-tasks',
          label: 'High-Difficulty Prediction Tasks',
          content:
            "For tasks considered challenging even at full data availability, such as molecular subtyping (IDH mutation prediction), survival prediction from imaging alone, and early MCI classification, BrainIAC maintains its lead at every data fraction and the absolute performance gap persists even at 100% data. Concrete examples: at full data availability for IDH mutation prediction, BrainIAC achieves AUC 0.798 versus 0.687 for MedicalNet and 0.594 for BrainSegFounder (ranking BrainIAC 11 percentage points above the second-best). For MCI classification at 100% data, BrainIAC reaches AUC 0.884 versus 0.821 for MedicalNet. For glioblastoma survival prediction at 100% data, BrainIAC achieves AUC 0.723 internal and 0.664 external versus MedicalNet 0.537 and 0.488. This contrasts sharply with easier tasks like sequence classification, where all methods plateau near 97% balanced accuracy once enough data is available, and BrainIAC's advantage narrows. The pattern suggests BrainIAC's foundation model representations are particularly useful for extracting subtle imaging signals that correspond to abstract, non-obvious biological or clinical endpoints.",
        },
        {
          id: 'robustness',
          label: 'Resiliency to Artifacts',
          content:
            "Tested against three types of synthetically injected image perturbations that mimic real-world MRI acquisition variability: contrast shifts (scale 0.5 to 2.0, simulating scanner gamma variations), Gibbs ringing artifacts (scale 0.0 to 0.4, simulating k-space truncation), and bias field distortions (scale 0.0 to 0.4, simulating low-frequency intensity nonuniformity). Each perturbation was applied using MONAI framework functions (AdjustContrast, GibbsNoise, RandBiasField) over a grid of intensity scales. BrainIAC maintained more stable performance than MedicalNet, BrainSegFounder, and Scratch across all three perturbation types. The advantage was most pronounced in low-data tasks like mutation prediction, time-to-stroke, and survival prediction, where other models degraded noticeably as artifact intensity increased. Paper quote: 'BrainIAC maintained more stable performance than MedicalNet, BrainSegFounder and Scratch, especially in low-data tasks such as mutation prediction, time-to-stroke and survival prediction where other models noticeably degraded.' This robustness is important for real-world clinical deployment where scanner variability is unavoidable.",
        },
        {
          id: 'vs-supervised',
          label: 'Outperforms Supervised Training',
          content:
            "Across all seven downstream tasks and all six training data fractions evaluated (10%, 20%, 40%, 60%, 80%, 100%), BrainIAC matched or beat random-initialization supervised training (the Scratch baseline with matching architecture). The gap is largest in the low-data regime (10% to 40% training data) and narrows at 100% data, but never reverses. This pattern demonstrates that SSL pretraining on a large unlabeled corpus transfers meaningful representations to downstream tasks. Paper quote from Discussion: 'Our findings suggest that a BrainIAC foundation pipeline could replace traditional supervised learning strategies for brain MRI and allow for the development of models adaptable to challenging tasks in data-limited scenarios that were previously thought infeasible.' The implication for the field is that the traditional practice of training a new model from scratch for every new brain MRI problem is obsolete: foundation model fine-tuning should be the default.",
        },
      ],
    },
    {
      id: 'comparisons',
      label: 'Technical Comparisons',
      content:
        "Three baselines were used in every experiment to situate BrainIAC against existing practice. Each represents a different philosophy for how to approach 3D medical imaging. MedicalNet (Chen et al., 2019) is the standard general-purpose 3D medical imaging pretrained model, pretrained across diverse body parts and imaging modalities but not brain-specific. BrainSegFounder (Cox et al., 2024) is a recent brain-MRI-specific foundation model designed for neuroimage segmentation; it represents the closest direct competitor in the brain MRI foundation model space. Scratch (random initialization with matching architecture, trained end-to-end on each task) represents traditional supervised learning without any foundation model or transfer learning. Comparing against all three allows the paper to assess different components of BrainIAC's approach: brain-specificity (vs MedicalNet), classification/regression generality beyond segmentation (vs BrainSegFounder), and the value of SSL pretraining itself (vs Scratch). BrainIAC outperforms all three across virtually all seven tasks and all data fractions.",
      children: [
        {
          id: 'medicalnet',
          label: 'MedicalNet (3D General)',
          content:
            "MedicalNet (Chen, Ma, Zheng, 2019, Med3D: Transfer Learning for 3D Medical Image Analysis, arXiv:1904.00625) is a 3D medical imaging pretrained model built on supervised pretraining across a diverse collection of medical imaging tasks and body parts (not brain-specific). It uses a ResNet backbone and was trained with segmentation objectives on 23 medical datasets spanning various organs and imaging modalities (CT and MRI of lungs, liver, kidney, etc.). In the BrainIAC paper, MedicalNet serves as the broadest general-purpose 3D medical imaging baseline. The comparison isolates the value of brain-specific pretraining: both methods are pretrained foundation models, but BrainIAC is pretrained on brain MRI specifically while MedicalNet is general medical imaging. BrainIAC beats MedicalNet across all seven tasks, with the gap widest in low-data regimes. Paper observation: the inherent differences between MRI intensity values, sequence acquisitions, and brain anatomy versus other body parts make a brain-MRI-specific foundation model critical to high-performing neuroimaging algorithms.",
        },
        {
          id: 'brainseg',
          label: 'BrainSegFounder',
          content:
            "BrainSegFounder (Cox et al., 2024, Med. Image Anal. 97:103301) is a brain-MRI-specific foundation model designed specifically for neuroimage segmentation tasks. It uses a Swin Transformer backbone pretrained with masked autoencoding on a large brain MRI corpus. In the BrainIAC paper, BrainSegFounder serves as the closest direct competitor in the brain MRI foundation model space. The comparison isolates the value of BrainIAC's SimCLR contrastive approach versus BrainSegFounder's MAE reconstruction approach, and more importantly tests whether a segmentation-focused foundation model transfers to broader classification and regression tasks. Result: BrainIAC outperforms BrainSegFounder on virtually all tasks, with particularly large gaps on classification and regression tasks where BrainSegFounder was not specifically optimized. On the tumor segmentation task itself, where BrainSegFounder should have a home-field advantage, BrainIAC still modestly outperforms it at most data fractions (for example, 0.795 vs 0.756 mean Dice at 100% data).",
        },
        {
          id: 'scratch',
          label: 'Scratch (Random Init)',
          content:
            "A randomly-initialized encoder of matching architecture to BrainIAC (ViT-B for classification and regression tasks, UNETR for segmentation), trained end-to-end on each task with no pretraining or transfer learning. This represents traditional supervised learning in its purest form and serves as the floor baseline: any reasonable pretrained method should beat Scratch, especially in low-data regimes. Scratch is also the fairest way to isolate the value of SSL pretraining specifically: both BrainIAC and Scratch have identical architectures, identical fine-tuning procedures, and identical task-specific training data; the only difference is whether the encoder weights start from SimCLR pretraining or random initialization. Across all seven tasks and all data fractions, BrainIAC beats Scratch, with the gap largest in low-data regimes. On tumor segmentation at K=1 (single training scan), BrainIAC achieves Dice 0.518 while Scratch fails essentially completely at Dice 0.035. The consistent Scratch underperformance quantifies the value of the SSL pretraining step.",
        },
      ],
    },
  ],
};

const CITATION = `@article{tak2026brainiac,
  title={A generalizable foundation model for analysis of human brain MRI},
  author={Tak, Divyanshu and Garomsa, Biniam A. and Zapaishchykova, Anna and others},
  journal={Nature Neuroscience},
  volume={29},
  pages={945--956},
  year={2026},
  doi={10.1038/s41593-026-02202-6}
}`;

// ============ SMALL COMPONENTS ============

function BrainLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="brainGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30" stroke="url(#brainGrad)" strokeWidth="1.5" fill="none" opacity="0.5" />
      <path d="M20 32 Q20 20 32 20 Q44 20 44 32 Q44 44 32 44 Q20 44 20 32 Z" stroke="url(#brainGrad)" strokeWidth="1.5" fill="none" />
      <path d="M32 20 L32 44 M24 24 Q28 32 24 40 M40 24 Q36 32 40 40" stroke="url(#brainGrad)" strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx="32" cy="32" r="2" fill="#2dd4bf" />
    </svg>
  );
}

function StatNumber({ value, label, suffix = '' }) {
  return (
    <div className="flex flex-col">
      <div className="font-serif text-5xl md:text-6xl tracking-tight" style={{ color: '#f0f2f5' }}>
        {value}<span className="text-teal-400">{suffix}</span>
      </div>
      <div className="text-xs uppercase tracking-widest mt-2" style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>
        {label}
      </div>
    </div>
  );
}

function SectionLabel({ number, title }) {
  return (
    <div className="flex items-baseline gap-4 mb-8 border-b pb-4" style={{ borderColor: '#1f242c' }}>
      <span className="font-serif text-2xl" style={{ color: '#2dd4bf' }}>{number}</span>
      <span className="text-xs uppercase tracking-widest" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
        {title}
      </span>
    </div>
  );
}

function ChartTooltip({ active, payload, label, metric, higherBetter }) {
  if (!active || !payload || !payload.length) return null;
  const sorted = [...payload].sort((a, b) => (higherBetter ? b.value - a.value : a.value - b.value));
  return (
    <div className="rounded-sm border px-3 py-2 text-xs font-mono" style={{ background: '#0a0c10', borderColor: '#2a3038' }}>
      <div className="mb-1.5 pb-1.5 border-b uppercase tracking-wider" style={{ borderColor: '#1f242c', color: '#8b94a3', fontSize: '10px', letterSpacing: '0.1em' }}>
        {label} · {metric}
      </div>
      {sorted.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-6 py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: '#f0f2f5' }}>{p.name}</span>
          </div>
          <span style={{ color: '#f0f2f5' }}>{Number(p.value).toFixed(3)}</span>
        </div>
      ))}
    </div>
  );
}

// Lightbox: click any paper figure → full-size view, ESC or X to close.
function Lightbox({ fig, onClose }) {
  useEffect(() => {
    if (!fig) return;  // only lock scroll + attach listeners when open
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [fig, onClose]);

  if (!fig) return null;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: 'rgba(5, 7, 10, 0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 transition-colors hover:bg-white/10 rounded-full"
        style={{ color: '#f0f2f5' }}
        aria-label="Close"
      >
        <X size={24} />
      </button>
      <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#2dd4bf', letterSpacing: '0.2em' }}>
              {fig.label}
            </div>
            <h3 className="font-serif text-2xl md:text-3xl" style={{ color: '#f0f2f5' }}>{fig.title}</h3>
          </div>
          <div className="text-xs uppercase tracking-widest" style={{ color: '#5b6472', letterSpacing: '0.15em' }}>
            ESC to close
          </div>
        </div>
        <div className="bg-white p-2 md:p-4 overflow-auto" style={{ maxHeight: '75vh' }}>
          <img src={fig.src} alt={fig.title} className="w-full h-auto" />
        </div>
        <p className="text-sm leading-relaxed mt-4" style={{ color: '#c0c5ce' }}>{fig.caption}</p>
      </div>
    </div>
  );
}

function PaperFigureCard({ fig, onOpen }) {
  return (
    <button
      onClick={() => onOpen(fig)}
      className="group text-left block transition-all hover:-translate-y-0.5"
      style={{ background: '#0d1015', border: '1px solid #1f242c' }}
    >
      <div className="relative overflow-hidden flex items-center justify-center" style={{ background: '#fafafa', height: '220px' }}>
        <img src={fig.src} alt={fig.title} className="max-w-full max-h-full object-contain block" loading="lazy" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(10, 12, 16, 0.7)' }}>
          <div className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest" style={{ background: '#2dd4bf', color: '#0a0c10', letterSpacing: '0.15em', fontWeight: 600 }}>
            <Maximize2 size={12} />
            Enlarge
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#2dd4bf', letterSpacing: '0.15em' }}>
          {fig.label}
        </div>
        <div className="font-serif text-lg mb-2" style={{ color: '#f0f2f5' }}>{fig.title}</div>
        <div className="text-xs leading-relaxed" style={{ color: '#8b94a3' }}>{fig.caption}</div>
      </div>
    </button>
  );
}

// ============ MAJOR SECTIONS ============

function PerformanceExplorer() {
  const [activeTask, setActiveTask] = useState(TASKS[2]);
  const [visibleModels, setVisibleModels] = useState(Object.fromEntries(Object.keys(MODELS).map((k) => [k, true])));
  const toggleModel = (m) => setVisibleModels((v) => ({ ...v, [m]: !v[m] }));

  const gap = useMemo(() => {
    const low = activeTask.data[0];
    const others = ['BrainSegFounder', 'MedicalNet', 'Scratch'].map((m) => low[m]);
    const bestOther = activeTask.higherBetter ? Math.max(...others) : Math.min(...others);
    const diff = activeTask.higherBetter
      ? ((low.BrainIAC - bestOther) / bestOther) * 100
      : ((bestOther - low.BrainIAC) / bestOther) * 100;
    return diff;
  }, [activeTask]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8">
        {TASKS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTask(t)}
            className="px-4 py-2 text-xs uppercase tracking-wider transition-all"
            style={{
              background: activeTask.id === t.id ? '#2dd4bf' : 'transparent',
              color: activeTask.id === t.id ? '#0a0c10' : '#8b94a3',
              border: `1px solid ${activeTask.id === t.id ? '#2dd4bf' : '#2a3038'}`,
              letterSpacing: '0.1em',
              fontWeight: activeTask.id === t.id ? 600 : 400,
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h3 className="font-serif text-3xl mb-4" style={{ color: '#f0f2f5' }}>{activeTask.name}</h3>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#c0c5ce' }}>{activeTask.description}</p>
          <p className="text-xs leading-relaxed mb-8" style={{ color: '#8b94a3' }}>{activeTask.detail}</p>

          <div className="grid grid-cols-2 gap-4 py-4 border-t border-b" style={{ borderColor: '#1f242c' }}>
            <div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>Test set</div>
              <div className="font-serif text-2xl" style={{ color: '#f0f2f5' }}>{activeTask.ntest.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest mb-1" style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>Train (full)</div>
              <div className="font-serif text-2xl" style={{ color: '#f0f2f5' }}>{activeTask.ntrain.toLocaleString()}</div>
            </div>
          </div>

          <div className="mt-6 p-4" style={{ background: 'rgba(45, 212, 191, 0.05)', border: '1px solid rgba(45, 212, 191, 0.2)' }}>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#2dd4bf', letterSpacing: '0.15em' }}>BrainIAC at 10% data</div>
            <div className="font-serif text-3xl mb-1" style={{ color: '#2dd4bf' }}>
              {gap > 0 ? '+' : ''}{gap.toFixed(1)}%
            </div>
            <div className="text-xs" style={{ color: '#c0c5ce' }}>relative improvement over best baseline</div>
          </div>

          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>Toggle models</div>
            <div className="space-y-2">
              {Object.entries(MODELS).map(([k, m]) => (
                <button
                  key={k}
                  onClick={() => toggleModel(k)}
                  className="w-full flex items-center justify-between py-2 px-3 text-xs transition-all"
                  style={{
                    background: visibleModels[k] ? 'rgba(255,255,255,0.03)' : 'transparent',
                    border: `1px solid ${visibleModels[k] ? m.color + '40' : '#1f242c'}`,
                    opacity: visibleModels[k] ? 1 : 0.4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ background: m.color }} />
                    <span className="font-mono" style={{ color: '#f0f2f5' }}>{m.label}</span>
                  </div>
                  <span className="font-mono" style={{ color: m.color }}>
                    {activeTask.data[activeTask.data.length - 1][k]?.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-widest" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
              Performance vs. training data availability
            </div>
            <div className="text-xs font-mono" style={{ color: '#8b94a3' }}>y: {activeTask.metric}</div>
          </div>
          <div style={{ background: '#0d1015', border: '1px solid #1f242c', padding: '24px' }}>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={activeTask.data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid stroke="#1f242c" vertical={false} />
                <XAxis dataKey="pct" tick={{ fill: '#8b94a3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: '#2a3038' }} tickLine={false} />
                <YAxis tick={{ fill: '#8b94a3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                <Tooltip content={<ChartTooltip metric={activeTask.metric} higherBetter={activeTask.higherBetter} />} cursor={{ stroke: '#2dd4bf', strokeOpacity: 0.3, strokeWidth: 1 }} />
                {Object.entries(MODELS).map(([k, m]) => visibleModels[k] && (
                  <Line
                    key={k} type="monotone" dataKey={k} stroke={m.color}
                    strokeWidth={k === 'BrainIAC' ? 2.5 : 1.5}
                    dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: m.color, stroke: '#0a0c10', strokeWidth: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 text-xs text-right font-mono" style={{ color: '#5b6472' }}>
            mean ± 95% CI from 1,000 bootstrap samples
          </div>

          {/* Inline figure if this task has one (e.g. segmentation overlays) */}
          {activeTask.figure && (
            <div className="mt-6" style={{ background: '#0d1015', border: '1px solid #1f242c' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2 text-xs uppercase tracking-widest" style={{ borderColor: '#1f242c', color: '#2dd4bf', letterSpacing: '0.15em' }}>
                <Eye size={12} />
                Qualitative example · Fig. 4d
              </div>
              <div style={{ background: '#fafafa' }}>
                <img src={activeTask.figure.src} alt={activeTask.figure.caption} className="w-full h-auto block" loading="lazy" />
              </div>
              <div className="p-4 text-xs leading-relaxed" style={{ color: '#8b94a3' }}>
                {activeTask.figure.caption}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FewShotPanel() {
  const [mode, setMode] = useState('K1');
  const chartData = TASKS.map((t) => ({
    task: t.name.split(' ').slice(0, 2).join('\n'),
    taskFull: t.name,
    BrainIAC: t.fewShot[mode].BrainIAC,
    BrainSegFounder: t.fewShot[mode].BrainSegFounder,
    MedicalNet: t.fewShot[mode].MedicalNet,
    Scratch: t.fewShot[mode].Scratch,
    higherBetter: t.higherBetter,
  }));
  const higherBetterData = chartData.filter((d) => d.higherBetter);
  const lowerBetterData = chartData.filter((d) => !d.higherBetter);

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm max-w-2xl" style={{ color: '#c0c5ce' }}>
            When only 1 or 5 samples per class are available (a realistic constraint in rare-disease settings), BrainIAC's learned representations enable meaningful adaptation where others collapse to chance.
          </p>
        </div>
        <div className="flex gap-0 border" style={{ borderColor: '#2a3038' }}>
          {['K1', 'K5'].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-5 py-2 text-xs uppercase tracking-widest transition-all"
              style={{
                background: mode === m ? '#2dd4bf' : 'transparent',
                color: mode === m ? '#0a0c10' : '#8b94a3',
                letterSpacing: '0.15em',
                fontWeight: mode === m ? 600 : 400,
              }}
            >
              {m === 'K1' ? 'K = 1' : 'K = 5'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div style={{ background: '#0d1015', border: '1px solid #1f242c', padding: '20px' }}>
          <div className="text-xs uppercase tracking-widest mb-4" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
            Higher is better (AUC, BA, Dice)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={higherBetterData} margin={{ top: 10, right: 10, bottom: 30, left: -20 }}>
              <CartesianGrid stroke="#1f242c" vertical={false} />
              <XAxis dataKey="task" tick={{ fill: '#8b94a3', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: '#2a3038' }} tickLine={false} interval={0} />
              <YAxis tick={{ fill: '#8b94a3', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip metric="Score" higherBetter={true} />} cursor={{ fill: 'rgba(45, 212, 191, 0.05)' }} />
              <Bar dataKey="BrainIAC" fill={MODELS.BrainIAC.color} />
              <Bar dataKey="BrainSegFounder" fill={MODELS.BrainSegFounder.color} />
              <Bar dataKey="MedicalNet" fill={MODELS.MedicalNet.color} />
              <Bar dataKey="Scratch" fill={MODELS.Scratch.color} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#0d1015', border: '1px solid #1f242c', padding: '20px' }}>
          <div className="text-xs uppercase tracking-widest mb-4" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
            Lower is better (MAE)
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={lowerBetterData} margin={{ top: 10, right: 10, bottom: 30, left: -10 }}>
              <CartesianGrid stroke="#1f242c" vertical={false} />
              <XAxis dataKey="task" tick={{ fill: '#8b94a3', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }} axisLine={{ stroke: '#2a3038' }} tickLine={false} interval={0} />
              <YAxis tick={{ fill: '#8b94a3', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip metric="Error" higherBetter={false} />} cursor={{ fill: 'rgba(45, 212, 191, 0.05)' }} />
              <Bar dataKey="BrainIAC" fill={MODELS.BrainIAC.color} />
              <Bar dataKey="BrainSegFounder" fill={MODELS.BrainSegFounder.color} />
              <Bar dataKey="MedicalNet" fill={MODELS.MedicalNet.color} />
              <Bar dataKey="Scratch" fill={MODELS.Scratch.color} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
        {Object.entries(MODELS).map(([k, m]) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-3 h-3" style={{ background: m.color }} />
            <span className="text-xs uppercase tracking-wider font-mono" style={{ color: '#c0c5ce', letterSpacing: '0.1em' }}>
              {m.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RobustnessPanel() {
  const [active, setActive] = useState('contrast');
  const current = ROBUSTNESS_DATA[active];

  return (
    <div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="max-w-2xl">
          <p className="text-sm leading-relaxed" style={{ color: '#c0c5ce' }}>
            Real clinical scanners vary. We injected three families of synthetic artifacts into test-time images and measured how each model degrades on IDH mutation prediction. BrainIAC degrades least; its features are stable across the distributions radiologists actually see.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          {Object.entries(ROBUSTNESS_DATA).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setActive(k)}
              className="text-left px-4 py-2 text-xs uppercase tracking-wider transition-all"
              style={{
                background: active === k ? 'rgba(45, 212, 191, 0.08)' : 'transparent',
                color: active === k ? '#2dd4bf' : '#8b94a3',
                borderLeft: `2px solid ${active === k ? '#2dd4bf' : 'transparent'}`,
                letterSpacing: '0.15em',
              }}
            >
              {v.title}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#0d1015', border: '1px solid #1f242c', padding: '28px' }}>
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="font-serif text-2xl" style={{ color: '#f0f2f5' }}>{current.title}</h4>
          <div className="text-xs font-mono" style={{ color: '#8b94a3' }}>y: AUC</div>
        </div>
        <p className="text-xs mb-6" style={{ color: '#8b94a3' }}>{current.description}</p>

        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={current.data} margin={{ top: 20, right: 20, left: 0, bottom: 30 }}>
            <CartesianGrid stroke="#1f242c" vertical={false} />
            <XAxis
              dataKey="scale"
              tick={{ fill: '#8b94a3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
              axisLine={{ stroke: '#2a3038' }} tickLine={false}
              label={{ value: current.unit, position: 'insideBottom', offset: -15, fill: '#8b94a3', fontSize: 10 }}
            />
            <YAxis domain={[0.4, 0.8]} tick={{ fill: '#8b94a3', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip metric="AUC" higherBetter={true} />} cursor={{ stroke: '#2dd4bf', strokeOpacity: 0.3 }} />
            {Object.entries(MODELS).map(([k, m]) => (
              <Line
                key={k} type="monotone" dataKey={k} stroke={m.color}
                strokeWidth={k === 'BrainIAC' ? 2.5 : 1.5}
                dot={{ r: 3, fill: m.color, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: m.color, stroke: '#0a0c10', strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SaliencyMapsSection({ onOpenFigure }) {
  const fig7 = PAPER_FIGURES.find(f => f.id === 'fig7');
  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed max-w-3xl" style={{ color: '#c0c5ce' }}>
        For each task the paper generated saliency maps: contour overlays showing which voxels the model weighs most heavily, and Smooth Grad heatmaps showing the attention pattern. The model consistently looks where a neuroradiologist would: the hippocampus in MCI, periventricular white matter in brain age, enhancing tumor cores in IDH and survival prediction.
      </p>

      {/* Fig 7 card: same convention as gallery, just a bit taller to anchor the section */}
      <div className="max-w-2xl">
        <button
          onClick={() => onOpenFigure(fig7)}
          className="group text-left block transition-all hover:-translate-y-0.5 w-full"
          style={{ background: '#0d1015', border: '1px solid #1f242c' }}
        >
          <div className="relative overflow-hidden flex items-center justify-center" style={{ background: '#fafafa', height: '340px' }}>
            <img src="./figures/fig7-full.webp" alt={fig7.title} className="max-w-full max-h-full object-contain block" loading="lazy" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(10, 12, 16, 0.7)' }}>
              <div className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest" style={{ background: '#2dd4bf', color: '#0a0c10', letterSpacing: '0.15em', fontWeight: 600 }}>
                <Maximize2 size={12} />
                Enlarge
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: '#2dd4bf', letterSpacing: '0.15em' }}>
              {fig7.label}
            </div>
            <div className="font-serif text-lg mb-2" style={{ color: '#f0f2f5' }}>{fig7.title}</div>
            <div className="text-xs leading-relaxed" style={{ color: '#8b94a3' }}>
              <span style={{ color: '#c0c5ce' }}>(a) Frozen backbone.</span> Attention from the pretrained BrainIAC encoder without any task-specific training, shown across four MRI sequences (T2FLAIR, T1w, T2w, T1ce).{' '}
              <span style={{ color: '#c0c5ce' }}>(b) Task-specific fine-tuned.</span> After end-to-end fine-tuning on 100% training data, attention localizes to task-relevant anatomy.
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// ============ MINDMAP EXPLORER ============
// Interactive concept tree. Left: collapsible vertical tree (children expand BELOW parent).
// Right: detail panel showing the content for the currently selected node.

function MindmapExplorer() {
  const [expanded, setExpanded] = useState({ root: true });
  const [selected, setSelected] = useState(MINDMAP);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const handleClick = (node) => {
    setSelected(node);
    if (node.children && node.children.length > 0) toggle(node.id);
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6" style={{ minHeight: '560px' }}>
      {/* LEFT — vertical tree */}
      <div
        className="lg:col-span-3 p-5 overflow-auto"
        style={{ background: '#0d1015', border: '1px solid #1f242c', maxHeight: '640px' }}
      >
        <MindmapNode
          node={MINDMAP}
          depth={0}
          expanded={expanded}
          selectedId={selected.id}
          onClick={handleClick}
        />
      </div>

      {/* RIGHT — detail panel */}
      <div
        className="lg:col-span-2 p-6 overflow-auto"
        style={{ background: '#0d1015', border: '1px solid #2dd4bf', borderLeftWidth: '3px', maxHeight: '640px' }}
      >
        <div
          className="text-xs uppercase tracking-widest mb-3"
          style={{ color: '#2dd4bf', letterSpacing: '0.2em' }}
        >
          {selected.id === 'root' ? 'Concept map' : 'Selected concept'}
        </div>
        <h3 className="font-serif text-2xl mb-4 leading-tight" style={{ color: '#f0f2f5', fontWeight: 500 }}>
          {selected.label}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: '#c0c5ce' }}>
          {selected.content}
        </p>
        {selected.children && selected.children.length > 0 && (
          <div
            className="mt-6 pt-4 border-t text-xs"
            style={{ borderColor: '#1f242c', color: '#8b94a3' }}
          >
            <div className="uppercase tracking-widest mb-2" style={{ letterSpacing: '0.15em' }}>
              {selected.children.length} sub-concept{selected.children.length === 1 ? '' : 's'}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    if (!expanded[selected.id]) toggle(selected.id);
                  }}
                  className="px-2 py-1 transition-colors hover:bg-white hover:text-black"
                  style={{ border: '1px solid #2a3038', color: '#c0c5ce', fontSize: '11px' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Vertical tree: children are rendered BELOW parent with left-indented dashed border.
function MindmapNode({ node, depth, expanded, selectedId, onClick }) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = !!expanded[node.id];
  const isSelected = selectedId === node.id;

  // Color palette by depth — subtle hierarchy
  const palette = ['#2dd4bf', '#818cf8', '#f97316', '#ec4899'];
  const accent = palette[Math.min(depth, palette.length - 1)];

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : '20px' }}>
      <button
        onClick={() => onClick(node)}
        className="flex items-start gap-2 text-left py-2 px-3 w-full transition-all group"
        style={{
          background: isSelected ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
          borderLeft: `2px solid ${isSelected ? accent : 'transparent'}`,
          color: isSelected ? '#f0f2f5' : '#c0c5ce',
        }}
      >
        {/* Expand indicator or leaf dot */}
        <div className="shrink-0 mt-1" style={{ color: accent }}>
          {hasChildren ? (
            <ChevronRight
              size={12}
              style={{
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 150ms',
              }}
            />
          ) : (
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: accent,
                marginTop: 4,
                marginLeft: 3,
              }}
            />
          )}
        </div>
        {/* Label */}
        <div
          className={`transition-colors group-hover:text-white ${depth === 0 ? 'font-serif text-base' : 'text-sm'}`}
          style={{ fontWeight: depth === 0 ? 500 : 400 }}
        >
          {node.label}
        </div>
      </button>

      {/* Children — rendered BELOW when expanded (vertical indented tree) */}
      {hasChildren && isExpanded && (
        <div
          className="ml-4 mt-1 mb-1 space-y-0.5"
          style={{ borderLeft: '1px dashed #2a3038', paddingLeft: '4px' }}
        >
          {node.children.map((child) => (
            <MindmapNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              selectedId={selectedId}
              onClick={onClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DatasetCatalog() {
  const [filter, setFilter] = useState('All');
  const conditions = ['All', ...new Set(DATASETS.map((d) => d.condition))];
  const filtered = filter === 'All' ? DATASETS : DATASETS.filter((d) => d.condition === filter);
  const maxScans = Math.max(...DATASETS.map((d) => d.scans));
  const total = filtered.reduce((a, b) => a + b.scans, 0);

  return (
    <div>
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm leading-relaxed max-w-2xl" style={{ color: '#c0c5ce' }}>
            36 datasets. 48,965 brain MRIs. Ten neurological conditions, from healthy brains to glioblastoma, Alzheimer's, Parkinson's, and pediatric gliomas. Four sequences: T1, T2, T1CE, FLAIR.
          </p>
        </div>
        <div className="text-right">
          <div className="font-serif text-3xl" style={{ color: '#2dd4bf' }}>{total.toLocaleString()}</div>
          <div className="text-xs uppercase tracking-widest" style={{ color: '#8b94a3', letterSpacing: '0.15em' }}>scans in view</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {conditions.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="px-3 py-1.5 text-xs uppercase tracking-wider transition-all flex items-center gap-2"
            style={{
              background: filter === c ? '#f0f2f5' : 'transparent',
              color: filter === c ? '#0a0c10' : '#8b94a3',
              border: `1px solid ${filter === c ? '#f0f2f5' : '#2a3038'}`,
              letterSpacing: '0.1em',
            }}
          >
            {c !== 'All' && <span className="w-2 h-2 rounded-full" style={{ background: CONDITION_COLORS[c] }} />}
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-0" style={{ background: '#0d1015', border: '1px solid #1f242c' }}>
        {filtered.map((d) => (
          <div key={d.name} className="flex items-center justify-between py-3 px-5 border-b" style={{ borderColor: '#1a1e24' }}>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CONDITION_COLORS[d.condition] }} />
              <span className="text-sm font-mono" style={{ color: '#f0f2f5' }}>{d.name}</span>
              <span className="text-xs" style={{ color: '#5b6472' }}>{d.condition}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-16 h-0.5" style={{ background: '#1f242c' }}>
                <div className="h-full" style={{ background: CONDITION_COLORS[d.condition], width: `${(d.scans / maxScans) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums w-12 text-right font-mono" style={{ color: '#c0c5ce' }}>
                {d.scans.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinearProbePanel() {
  const data = TASKS.filter((t) => t.higherBetter).map((t) => ({
    task: t.name,
    BrainIAC: t.linearProbe.BrainIAC,
    BrainSegFounder: t.linearProbe.BrainSegFounder,
    MedicalNet: t.linearProbe.MedicalNet,
  }));

  return (
    <div>
      <p className="text-sm leading-relaxed mb-8 max-w-2xl" style={{ color: '#c0c5ce' }}>
        Freeze the backbone. Train only a linear head. What you measure is purely the quality of the learned representation: no finetuning, no task-specific sculpting. BrainIAC wins on every task.
      </p>

      <div style={{ background: '#0d1015', border: '1px solid #1f242c', padding: '24px' }}>
        <ResponsiveContainer width="100%" height={360}>
          <RadarChart data={data}>
            <PolarGrid stroke="#1f242c" />
            <PolarAngleAxis dataKey="task" tick={{ fill: '#c0c5ce', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }} />
            <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fill: '#5b6472', fontSize: 9 }} axisLine={false} />
            <Radar name="BrainIAC" dataKey="BrainIAC" stroke={MODELS.BrainIAC.color} fill={MODELS.BrainIAC.color} fillOpacity={0.25} strokeWidth={2} />
            <Radar name="BrainSegFounder" dataKey="BrainSegFounder" stroke={MODELS.BrainSegFounder.color} fill={MODELS.BrainSegFounder.color} fillOpacity={0.1} strokeWidth={1.5} />
            <Radar name="MedicalNet" dataKey="MedicalNet" stroke={MODELS.MedicalNet.color} fill={MODELS.MedicalNet.color} fillOpacity={0.1} strokeWidth={1.5} />
            <Tooltip content={<ChartTooltip metric="Frozen-backbone" higherBetter={true} />} />
            <Legend
              iconType="square"
              wrapperStyle={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: 16 }}
              formatter={(v) => <span style={{ color: '#c0c5ce' }}>{v}</span>}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CitationBox() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CITATION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="relative" style={{ background: '#0d1015', border: '1px solid #1f242c' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#1f242c' }}>
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
          <Quote size={12} /> BibTeX
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-2 px-3 py-1 text-xs uppercase tracking-wider transition-all"
          style={{
            background: copied ? '#2dd4bf' : 'transparent',
            color: copied ? '#0a0c10' : '#c0c5ce',
            border: `1px solid ${copied ? '#2dd4bf' : '#2a3038'}`,
            letterSpacing: '0.1em',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-xs overflow-x-auto font-mono" style={{ color: '#c0c5ce' }}>{CITATION}</pre>
    </div>
  );
}

function ResourceCard({ icon: Icon, title, description, href, primary }) {
  return (
    <a
      href={href} target="_blank" rel="noopener noreferrer"
      className="group block p-6 transition-all hover:-translate-y-0.5"
      style={{
        background: primary ? 'rgba(45, 212, 191, 0.05)' : '#0d1015',
        border: `1px solid ${primary ? 'rgba(45, 212, 191, 0.3)' : '#1f242c'}`,
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <Icon size={20} style={{ color: primary ? '#2dd4bf' : '#8b94a3' }} />
        <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" style={{ color: primary ? '#2dd4bf' : '#5b6472' }} />
      </div>
      <div className="font-serif text-xl mb-2" style={{ color: '#f0f2f5' }}>{title}</div>
      <div className="text-xs leading-relaxed" style={{ color: '#8b94a3' }}>{description}</div>
    </a>
  );
}

// ============ APP ============

export default function App() {
  const [lightboxFig, setLightboxFig] = useState(null);

  return (
    <div style={{ background: '#0a0c10', minHeight: '100vh', color: '#f0f2f5' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur" style={{ background: 'rgba(10, 12, 16, 0.85)', borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="#overview" className="flex items-center gap-3">
            <BrainLogo size={28} />
            <div>
              <div className="font-serif text-lg leading-none" style={{ fontWeight: 500 }}>BrainIAC</div>
              <div className="text-xs uppercase tracking-widest" style={{ color: '#5b6472', letterSpacing: '0.2em' }}>
                Brain Imaging Adaptive Core
              </div>
            </div>
          </a>
          <nav className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>
            <a href="#overview" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Overview</a>
            <a href="#map" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Map</a>
            <a href="#results" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Results</a>
            <a href="#saliency" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Saliency</a>
            <a href="#figures" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Figures</a>
            <a href="#datasets" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Datasets</a>
            <a href="#resources" style={{ color: '#8b94a3' }} className="hover:text-white transition-colors">Resources</a>
          </nav>
          <a
            href="https://github.com/AIM-KannLab/BrainIAC" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all"
            style={{ background: '#2dd4bf', color: '#0a0c10', letterSpacing: '0.1em', fontWeight: 600 }}
          >
            <Github size={14} /> Code
          </a>
        </div>
      </header>

      {/* HERO */}
      <section id="overview" className="relative overflow-hidden grain" style={{ borderBottom: '1px solid #1f242c' }}>
        <div
          className="absolute top-1/2 right-0 w-[600px] h-[600px] rounded-full pointer-events-none pulse-ring"
          style={{ background: 'radial-gradient(circle, rgba(45, 212, 191, 0.08) 0%, transparent 70%)' }}
        />
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-24 relative">
          <div className="flex items-center gap-4 text-xs uppercase tracking-widest mb-12 fade-in" style={{ color: '#8b94a3', letterSpacing: '0.2em' }}>
            <span>Nature Neuroscience</span>
            <span style={{ color: '#2a3038' }}>·</span>
            <span>Vol. 29 · 945–956</span>
            <span style={{ color: '#2a3038' }}>·</span>
            <span>April 2026</span>
          </div>

          <div className="grid lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-8">
              <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight mb-8 fade-in" style={{ color: '#f0f2f5', fontWeight: 400 }}>
                A generalizable foundation model for{' '}
                <span style={{ color: '#2dd4bf', fontStyle: 'italic', fontWeight: 300 }}>human brain MRI</span>
              </h1>
              <p className="text-lg leading-relaxed max-w-2xl mb-8 fade-in" style={{ color: '#c0c5ce' }}>
                BrainIAC learns generalized representations from 32,015 unlabeled brain MRIs using self-supervised contrastive learning, then adapts to seven clinically meaningful tasks, outperforming supervised training and prior biomedical foundation models, especially where it matters most: low-data, few-shot, high-difficulty settings.
              </p>
              <div className="flex flex-wrap gap-3 mb-10 fade-in">
                <a href="https://doi.org/10.1038/s41593-026-02202-6" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 text-sm transition-all" style={{ background: '#f0f2f5', color: '#0a0c10', fontWeight: 500 }}>
                  <FileText size={14} /> Read the paper <ArrowUpRight size={14} />
                </a>
                <a href="https://github.com/AIM-KannLab/BrainIAC" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-3 text-sm transition-all" style={{ background: 'transparent', color: '#f0f2f5', border: '1px solid #2a3038' }}>
                  <Github size={14} /> Code & weights <ArrowUpRight size={14} />
                </a>
              </div>
              <div className="text-xs" style={{ color: '#5b6472' }}>
                Tak, Garomsa, Zapaishchykova, Chaunzwa, Climent Pardo, Ye, et al. (2026)
              </div>
            </div>

            <div className="lg:col-span-4 grid grid-cols-2 gap-x-8 gap-y-10 fade-in" style={{ animationDelay: '0.2s' }}>
              <StatNumber value="48,965" label="Brain MRIs" />
              <StatNumber value="36" label="Datasets" />
              <StatNumber value="7" label="Downstream tasks" />
              <StatNumber value="10" label="Conditions" />
              <StatNumber value="K=1" label="Few-shot capable" />
              <StatNumber value="4" label="MRI sequences" />
            </div>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="01" title="Why it matters" />
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-8" style={{ color: '#f0f2f5', fontWeight: 400 }}>
                Most brain MRI datasets are <em style={{ color: '#2dd4bf', fontStyle: 'italic' }}>small</em>. Most clinical tasks are <em style={{ color: '#2dd4bf', fontStyle: 'italic' }}>hard</em>. Most models trained on one site fail on another.
              </h2>
              <p className="text-base leading-relaxed mb-6" style={{ color: '#c0c5ce' }}>
                Supervised deep learning has made real advances in brain imaging, but it stalls where clinical need is greatest: rare diseases, prospective studies with limited cohorts, small institutions without ImageNet-scale label budgets. Foundation models pretrained on unlabeled data offer a way through, and they have transformed pathology, ophthalmology, and chest radiology. Brain MRI has been slower to follow, in part because the data is three-dimensional, multi-sequence, and heterogeneous across scanners.
              </p>
              <p className="text-base leading-relaxed" style={{ color: '#c0c5ce' }}>
                BrainIAC is a 3D ViT-B encoder pretrained with SimCLR on 32,015 multiparametric MRIs spanning ten neurological conditions. It was then evaluated on seven downstream tasks chosen to span the full spectrum of clinical difficulty, from sequence classification (easy for a radiologist) to IDH mutation prediction and time-to-stroke estimation (hard even with molecular assays).
              </p>
            </div>

            <div className="space-y-6">
              <div className="p-6" style={{ background: '#0d1015', border: '1px solid #1f242c' }}>
                <Zap size={18} style={{ color: '#2dd4bf' }} />
                <div className="font-serif text-lg mt-3 mb-2">Pretrain once</div>
                <div className="text-xs leading-relaxed" style={{ color: '#8b94a3' }}>
                  Contrastive SSL on 32,015 scans produces a single encoder reusable across tasks.
                </div>
              </div>
              <div className="p-6" style={{ background: '#0d1015', border: '1px solid #1f242c' }}>
                <Layers size={18} style={{ color: '#2dd4bf' }} />
                <div className="font-serif text-lg mt-3 mb-2">Adapt anywhere</div>
                <div className="text-xs leading-relaxed" style={{ color: '#8b94a3' }}>
                  Linear probe, few-shot, or full finetuning: all outperform supervised baselines.
                </div>
              </div>
              <div className="p-6" style={{ background: '#0d1015', border: '1px solid #1f242c' }}>
                <Shield size={18} style={{ color: '#2dd4bf' }} />
                <div className="font-serif text-lg mt-3 mb-2">Robust to scanners</div>
                <div className="text-xs leading-relaxed" style={{ color: '#8b94a3' }}>
                  Stable under contrast shifts, Gibbs ringing, and bias field distortions.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONCEPT MAP — interactive mindmap */}
      <section id="map" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="02" title="Concept map" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-6 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            The paper <em style={{ color: '#2dd4bf', fontStyle: 'italic' }}>at a glance</em>.
          </h2>
          <p className="text-base leading-relaxed mb-10 max-w-3xl" style={{ color: '#c0c5ce' }}>
            Click any concept to expand it and read a short explanation. The root breaks into five main branches (core technology, training data, downstream applications, performance advantages, and baseline comparisons). Each branch opens into deeper detail.
          </p>
          <MindmapExplorer />
        </div>
      </section>

      {/* PERFORMANCE */}
      <section id="results" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="03" title="Performance across seven tasks" />
          <p className="text-base leading-relaxed mb-12 max-w-3xl" style={{ color: '#c0c5ce' }}>
            Each task was evaluated at six levels of training data availability, from 10% to 100%, with end-to-end finetuning of the full encoder. The gap between BrainIAC and the best baseline is largest at 10% and 20%, the regimes most relevant to real clinical deployment. Selecting <span style={{ color: '#2dd4bf' }}>Tumor Segmentation</span> reveals a qualitative example from Figure 4d.
          </p>
          <PerformanceExplorer />
        </div>
      </section>

      {/* FEW-SHOT */}
      <section className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="04" title="Few-shot adaptation" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-10 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            One example per class. Or five. <em style={{ color: '#2dd4bf', fontStyle: 'italic' }}>Still useful.</em>
          </h2>
          <FewShotPanel />
        </div>
      </section>

      {/* LINEAR PROBE */}
      <section className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="05" title="Frozen backbone / linear probing" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-10 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            The feature space itself is the product.
          </h2>
          <LinearProbePanel />
        </div>
      </section>

      {/* ROBUSTNESS */}
      <section id="robustness" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="06" title="Robustness to scanner variability" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-10 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            A model that breaks at a new scanner <em style={{ color: '#2dd4bf', fontStyle: 'italic' }}>is not deployed</em>.
          </h2>

          {/* Approximation disclaimer */}
          <div
            className="mb-10 p-4 flex items-start gap-3 max-w-4xl"
            style={{ background: 'rgba(251, 191, 36, 0.06)', border: '1px solid rgba(251, 191, 36, 0.25)' }}
          >
            <div className="text-lg shrink-0" style={{ color: '#fbbf24', lineHeight: 1 }}>!</div>
            <div className="text-xs leading-relaxed" style={{ color: '#c0c5ce' }}>
              <span style={{ color: '#fbbf24', fontWeight: 500 }}>Approximated from Fig. 5 visual inspection.</span>{' '}
              Exact per-point values for robustness curves are published only in the paper's Source Data Fig. 5 spreadsheet,
              which was not accessible at the time this site was built. Numbers below are read off Fig. 5 (mutation prediction row)
              with an estimated accuracy of ±0.05. The qualitative pattern (BrainIAC remaining stable while other models degrade)
              is reliable; precise values are not. All other sections of this site are numerically exact and sourced from Supplementary Tables.
            </div>
          </div>

          <RobustnessPanel />
        </div>
      </section>

      {/* SALIENCY MAPS */}
      <section id="saliency" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="07" title="Where the model looks" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-10 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            Saliency maps show attention on <em style={{ color: '#2dd4bf', fontStyle: 'italic' }}>biologically plausible</em> regions.
          </h2>
          <SaliencyMapsSection onOpenFigure={setLightboxFig} />
        </div>
      </section>

      {/* FIGURES GALLERY */}
      <section id="figures" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="08" title="Figures from the paper" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-10 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            Click any figure to enlarge.
          </h2>
          <p className="text-sm leading-relaxed mb-10 max-w-3xl" style={{ color: '#c0c5ce' }}>
            The originals are in Nature Neuroscience, April 2026. Below is a curated gallery of the key figures with brief captions. Click to view at full resolution.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PAPER_FIGURES.map((fig) => (
              <PaperFigureCard key={fig.id} fig={fig} onOpen={setLightboxFig} />
            ))}
          </div>
        </div>
      </section>

      {/* DATASETS */}
      <section id="datasets" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="09" title="The pretraining corpus" />
          <h2 className="font-serif text-4xl md:text-5xl leading-tight mb-10 max-w-4xl" style={{ color: '#f0f2f5', fontWeight: 400 }}>
            Thirty-six datasets. Ten conditions. One encoder.
          </h2>
          <DatasetCatalog />
        </div>
      </section>

      {/* METHOD */}
      <section className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="10" title="Under the hood" />
          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="font-serif text-3xl mb-6" style={{ color: '#f0f2f5', fontWeight: 400 }}>Pretraining</h3>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#c0c5ce' }}>
                <p>
                  <span style={{ color: '#2dd4bf' }}>SimCLR contrastive objective</span> on 32,015 skull-stripped, bias-corrected 3D MRI volumes. Augmented patches from the same scan form positive pairs; everything else is a negative.
                </p>
                <p>
                  Three backbones benchmarked: SimCLR-ResNet50, SimCLR-ViT-B 3D, and MAE-SwinViT.{' '}
                  <span style={{ color: '#f0f2f5' }}>ViT-B showed consistent superior performance</span> across the seven task × few-shot combinations (Extended Data Fig. 2). Long-range spatial relationships turn out to matter more than inductive bias here.
                </p>
                <p className="pt-4 border-t" style={{ borderColor: '#1f242c' }}>
                  Input: (96, 96, 96) voxels at 1mm isotropic. 200 epochs, batch size 32, NVIDIA A6000, ~72 hours.
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-serif text-3xl mb-6" style={{ color: '#f0f2f5', fontWeight: 400 }}>Downstream adaptation</h3>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: '#c0c5ce' }}>
                <p>
                  Each task splits 80/20 into train-validation and held-out test. Train-validation is then further subsampled to{' '}
                  <span style={{ color: '#2dd4bf' }}>10%, 20%, 40%, 60%, 80%, 100%</span>: six data scarcity regimes.
                </p>
                <p>
                  At each level, four initialization strategies are compared:{' '}
                  <span style={{ color: '#f0f2f5' }}>BrainIAC pretraining, MedicalNet, BrainSegFounder, and random initialization (Scratch)</span>. All evaluated on the same frozen test set.
                </p>
                <p className="pt-4 border-t" style={{ borderColor: '#1f242c' }}>
                  Mean ± 95% CI reported across 1,000 bootstrap samples. DeLong tests for AUC comparisons.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESOURCES */}
      <section id="resources" className="relative" style={{ borderBottom: '1px solid #1f242c' }}>
        <div className="max-w-7xl mx-auto px-6 py-20">
          <SectionLabel number="11" title="Get it" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-12">
            <ResourceCard icon={Github} title="Code" description="Preprocessing pipelines, training scripts, inference utilities. All open source." href="https://github.com/AIM-KannLab/BrainIAC" primary />
            <ResourceCard icon={Globe} title="Platform" description="Upload a brain MRI, run BrainIAC and all seven downstream models in your browser." href="https://www.brainiac-platform.com/" />
            <ResourceCard icon={Download} title="Weights" description="Pretrained ViT-B backbone and task-specific heads, ready for finetuning." href="https://github.com/AIM-KannLab/BrainIAC" />
            <ResourceCard icon={FileText} title="Paper" description="Full methods, supplementary material, and all 35 reporting tables." href="https://doi.org/10.1038/s41593-026-02202-6" />
            <ResourceCard icon={Table} title="Supp. Tables" description="35 supplementary data tables with all bootstrap CIs, P-values, and per-dataset statistics." href="https://static-content.springer.com/esm/art%3A10.1038%2Fs41593-026-02202-6/MediaObjects/41593_2026_2202_MOESM1_ESM.pdf" />
            <ResourceCard icon={Database} title="Datasets" description="Links, DOIs, and access protocols for every one of the 36 source datasets." href="https://github.com/AIM-KannLab/BrainIAC" />
          </div>
          <div className="max-w-3xl"><CitationBox /></div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-start justify-between gap-8 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BrainLogo size={24} />
                <span className="font-serif text-xl">BrainIAC</span>
              </div>
              <div className="text-xs leading-relaxed max-w-md" style={{ color: '#5b6472' }}>
                A collaboration between the Artificial Intelligence in Medicine (AIM) Program at Mass General Brigham, Dana-Farber Cancer Institute, Harvard Medical School, Boston Children's Hospital, Memorial Sloan Kettering, University of Pennsylvania, UCSF, and Maastricht University.
              </div>
            </div>
            <div className="flex gap-12 text-xs uppercase tracking-widest" style={{ letterSpacing: '0.15em' }}>
              <div>
                <div className="mb-3" style={{ color: '#8b94a3' }}>Paper</div>
                <div className="space-y-2" style={{ color: '#5b6472' }}>
                  <div>Nature Neuroscience</div>
                  <div>Vol. 29, 945–956</div>
                  <div>April 2026</div>
                </div>
              </div>
              <div>
                <div className="mb-3" style={{ color: '#8b94a3' }}>Contact</div>
                <div className="space-y-2" style={{ color: '#5b6472' }}>
                  <div>bkann@bwh.harvard.edu</div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-6 flex items-center justify-between text-xs" style={{ borderTop: '1px solid #1f242c', color: '#5b6472' }}>
            <div>© 2026 The Author(s). CC BY-NC-ND 4.0.</div>
            <div className="font-mono">DOI: 10.1038/s41593-026-02202-6</div>
          </div>
        </div>
      </footer>

      {/* LIGHTBOX */}
      <Lightbox fig={lightboxFig} onClose={() => setLightboxFig(null)} />
    </div>
  );
}
