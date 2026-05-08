/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Clock, 
  BookOpen, 
  Users, 
  FileText, 
  AlertTriangle, 
  Info,
  ChevronRight,
  UserCheck,
  PenTool,
  Book,
  Briefcase,
  ShieldCheck,
  GraduationCap,
  CheckCircle2,
  Circle,
  Lightbulb,
  Download,
  User,
  UserPlus,
  ShieldAlert,
  Users2,
  Library,
  Globe,
  Map,
  Utensils,
  ClipboardCheck,
  GraduationCap as GraduationIcon,
  Trash2,
  PlusCircle,
  FileSpreadsheet,
  Camera,
  Printer,
  MousePointer2,
  CheckCircle,
  XCircle,
  Scan,
  RefreshCcw,
  Save
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Webcam from 'react-webcam';

// --- Types ---
interface WorkloadData {
  totalHours: number;
  lectivas: number;
  noLectivas: number;
  pea: number;
  comunidad: number;
}

interface TimeDisplay {
  hours: number;
  minutes: number;
  formatted: string;
}

interface CommunityActivity {
  id: string;
  name: string;
  icon: React.ReactNode;
  fixedTime?: number; // in hours
  isActive: boolean;
  customHours?: number;
  customMinutes?: number;
}

// --- Utils ---
const decimalToTime = (decimal: number): TimeDisplay => {
  const hours = Math.floor(Math.max(0, decimal));
  const minutes = Math.round((Math.max(0, decimal) - hours) * 60);
  return {
    hours,
    minutes,
    formatted: `${hours}h ${minutes.toString().padStart(2, '0')}m`
  };
};

interface StudentSimceData {
  id: string;
  name: string;
  scores: {
    [appIndex: number]: {
      [catIndex: number]: number;
    };
  };
}

interface SimceCategory {
  name: string;
  questions: string;
  total: number;
}

interface SimceAppConfig {
  name: string;
  categories: SimceCategory[];
}

const SIMCE_CONFIG: SimceAppConfig[] = [
  {
    name: '1° Aplicación',
    categories: [
      { name: 'Conocer', questions: '1-2-8-9-12-13-17-19-23-27-29', total: 11 },
      { name: 'Comprender', questions: '3-4-5-16-20-21-22-28-30', total: 9 },
      { name: 'Analizar', questions: '11-14-15', total: 3 },
      { name: 'Aplicar', questions: '10-24-25', total: 3 },
      { name: 'Inferir', questions: '6-7-18', total: 3 },
      { name: 'Evaluar', questions: '26', total: 1 },
    ]
  },
  {
    name: '2° Aplicación',
    categories: [
      { name: 'Conocer', questions: '1-2-3-8-9-10-15-16-21-22-25-26-29', total: 13 },
      { name: 'Comprender', questions: '4-5-6-7-11-17-18-19-20-28', total: 10 },
      { name: 'Analizar', questions: '14-23-27', total: 3 },
      { name: 'Aplicar', questions: '12-13-24-30', total: 4 },
    ]
  },
  {
    name: '3° Aplicación',
    categories: [
      { name: 'Conocer', questions: '1-2-5-7-8-10-11-12-14-15-16-17-19-23-24-26-27-34-35', total: 19 },
      { name: 'Comprender', questions: '3-4-20-21-22-30-33', total: 7 },
      { name: 'Analizar', questions: '13-28', total: 2 },
      { name: 'Aplicar', questions: '9-25', total: 2 },
      { name: 'Inferir', questions: '6-18-29-32', total: 4 },
      { name: 'Evaluar', questions: '31', total: 1 },
    ]
  },
  {
    name: '4° Aplicación',
    categories: [
      { name: 'Conocer', questions: '', total: 0 },
      { name: 'Comprender', questions: '', total: 0 },
      { name: 'Analizar', questions: '', total: 0 },
      { name: 'Aplicar', questions: '', total: 0 },
      { name: 'Inferir', questions: '', total: 0 },
      { name: 'Evaluar', questions: '', total: 0 },
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'jornada' | 'simce' | 'scanner'>('jornada');
  const [contractHours, setContractHours] = useState<number>(44);
  const [teacherName, setTeacherName] = useState<string>('');

  // Scanner State
  const [scannerConfig, setScannerConfig] = useState({
    activeAppIndex: 0,
    questionCount: 30,
    answerKey: {} as { [q: number]: string },
    selectedStudentId: ''
  });
  const [scanResult, setScanResult] = useState<{ [q: number]: string } | null>(null);
  const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'finished'>('idle');
  const [lastScanTime, setLastScanTime] = useState(0);

  // SIMCE State
  const [schoolInfo, setSchoolInfo] = useState({
    establishment: 'ESCUELA LAURA ROBLES SILVA',
    course: '8°B',
    dates: ['', '', '', '']
  });
  const [students, setStudents] = useState<StudentSimceData[]>([
    { id: '1', name: 'LURDES CAMILA AVALOS', scores: {} }
  ]);

  const webcamRef = React.useRef<Webcam>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Real-time processing loop
  React.useEffect(() => {
    let animationId: number;
    
    const loop = async () => {
      if (scannerStatus === 'scanning' && webcamRef.current) {
        await processScan(true); 
      }
      animationId = requestAnimationFrame(loop);
    };

    if (scannerStatus === 'scanning') {
      animationId = requestAnimationFrame(loop);
    }

    return () => cancelAnimationFrame(animationId);
  }, [scannerStatus]);

  const addStudent = () => {
    setStudents(prev => [...prev, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: '', 
      scores: {} 
    }]);
  };

  const removeStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
  };

  const updateStudentName = (id: string, name: string) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, name } : s));
  };

  const updateStudentScore = (studentId: string, appIdx: number, catIdx: number, score: number) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const newScores = { ...s.scores };
      if (!newScores[appIdx]) newScores[appIdx] = {};
      newScores[appIdx][catIdx] = score;
      return { ...s, scores: newScores };
    }));
  };

  // Community Activities State
  const [activities, setActivities] = useState<CommunityActivity[]>([
    { id: 'apoderados', name: 'Atención Apoderados', icon: <UserCheck className="w-4 h-4" />, fixedTime: 1, isActive: true },
    { id: 'consejo_tecnico', name: 'Consejo Técnico', icon: <Users className="w-4 h-4" />, fixedTime: 1.5, isActive: true },
    { id: 'talleres', name: 'Talleres', icon: <PenTool className="w-4 h-4" />, isActive: true },
    { id: 'libro_digital', name: 'Libro Digital', icon: <Book className="w-4 h-4" />, isActive: true },
    { id: 'reuniones_depto', name: 'Reuniones Departamento', icon: <Briefcase className="w-4 h-4" />, isActive: true },
    { id: 'desarrollo_prof', name: 'Desarrollo Profesional Docente', icon: <Lightbulb className="w-4 h-4" />, isActive: true },
    { id: 'consejo_adm', name: 'Consejo Administrativo', icon: <ShieldCheck className="w-4 h-4" />, fixedTime: 1.5, isActive: false },
    { id: 'ceal', name: 'CEAL', icon: <GraduationCap className="w-4 h-4" />, isActive: false },
    { id: 'refuerzo', name: 'Refuerzo Educativo', icon: <UserPlus className="w-4 h-4" />, isActive: false },
    { id: 'pise', name: 'PISE', icon: <ShieldAlert className="w-4 h-4" />, isActive: false },
    { id: 'cgp', name: 'CGP', icon: <Users2 className="w-4 h-4" />, isActive: false },
    { id: 'cra', name: 'CRA', icon: <Library className="w-4 h-4" />, isActive: false },
    { id: 'enlace', name: 'ENLACE', icon: <Globe className="w-4 h-4" />, isActive: false },
    { id: 'mruta', name: 'M.RUTA', icon: <Map className="w-4 h-4" />, isActive: false },
    { id: 'pae', name: 'PAE', icon: <Utensils className="w-4 h-4" />, isActive: false },
  ]);

  const toggleActivity = (id: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
  };

  const updateActivityTime = (id: string, field: 'customHours' | 'customMinutes', value: number) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const results = useMemo(() => {
    // --- Internal Logic (Updated to 58/42 as requested) ---
    // Note: UI and PDF still display "65/35" as per user requirement.
    
    // 1. Calculate Pedagogical Hours (HA) using 58% of contract
    // 1 HA = 45 min = 0.75 hours
    const ha = Math.round((contractHours * 0.58) / 0.75);
    
    // 2. Convert HA to Chronological Hours (HC)
    const hc = ha * 0.75;
    
    // 3. Calculate Recess (Recreo)
    // Maintaining the ratio from the 2019 table (3h recess for 38 HA)
    const recreo = ha * (3 / 38);
    
    // 4. Calculate Total No Lectivas (Effective for PEA + Community)
    // This will now represent the remaining 42% (approx)
    const noLectivasEfectivas = contractHours - hc - recreo;
    
    const pea = noLectivasEfectivas * 0.5;
    const comunidad = noLectivasEfectivas * 0.5;

    return {
      totalHours: contractHours,
      ha,
      hc,
      recreo,
      noLectivasEfectivas,
      pea,
      comunidad
    };
  }, [contractHours]);

  // Calculate Community Distribution
  const communityDistribution = useMemo(() => {
    const activeActivities = activities.filter(a => a.isActive);
    
    const isManual = (a: CommunityActivity) => 
      a.customHours !== undefined || a.customMinutes !== undefined;

    // Fixed activities are those with fixedTime OR those with custom inputs
    const fixedActivities = activeActivities.filter(a => 
      a.fixedTime !== undefined || isManual(a)
    );
    
    const variableActivities = activeActivities.filter(a => 
      a.fixedTime === undefined && !isManual(a)
    );

    const totalFixedTime = fixedActivities.reduce((sum, a) => {
      if (a.fixedTime !== undefined) return sum + a.fixedTime;
      if (isManual(a)) {
        const h = a.customHours || 0;
        const m = (a.customMinutes || 0) / 60;
        return sum + h + m;
      }
      return sum;
    }, 0);

    const remainingTime = Math.max(0, results.comunidad - totalFixedTime);
    const timePerVariable = variableActivities.length > 0 ? remainingTime / variableActivities.length : 0;

    return activeActivities.map(a => {
      if (a.fixedTime !== undefined) return { ...a, time: a.fixedTime };
      if (isManual(a)) {
        return { ...a, time: (a.customHours || 0) + (a.customMinutes || 0) / 60 };
      }
      return { ...a, time: timePerVariable };
    });
  }, [activities, results.comunidad]);

  const chartData = [
    { name: 'Docencia Aula (HC)', value: results.hc, color: '#3b82f6' },
    { name: 'Recreos', value: results.recreo, color: '#93c5fd' },
    { name: 'Preparación (PEA)', value: results.pea, color: '#10b981' },
    { name: 'Gestión/Comunidad', value: results.comunidad, color: '#f59e0b' },
  ];

  const hcTime = decimalToTime(results.hc);
  const recreoTime = decimalToTime(results.recreo);
  const peaTime = decimalToTime(results.pea);
  const comunidadTime = decimalToTime(results.comunidad);
  const totalNoLectivasTime = decimalToTime(results.noLectivasEfectivas);

  const exportPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleDateString();

    // Title
    doc.setFontSize(20);
    doc.setTextColor(59, 130, 246); // blue-600
    doc.text('Informe de Jornada Docente', 14, 22);

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Docente: ${teacherName || 'No especificado'}`, 14, 32);
    doc.text(`Fecha: ${timestamp}`, 14, 37);
    doc.text(`Contrato: ${contractHours} horas semanales`, 14, 42);
    doc.text('Basado en Tabla 2019 (Proporción 65/35)', 14, 47);

    // Main Table (Summary without specific times as requested)
    autoTable(doc, {
      startY: 55,
      head: [['Descripción', 'Sigla']],
      body: [
        ['Horas Lectivas (Docencia Aula)', 'HC'],
        ['Recreos', 'R'],
        ['Horas No Lectivas (Disponibles)', 'HNL'],
        ['  - Preparación y Evaluación (50% HNL)', 'PEA'],
        ['  - Gestión y Comunidad (50% HNL)', 'GC'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Community Activities Table
    const communityRows = communityDistribution.map(act => [
      act.name,
      act.fixedTime ? 'Fijo' : 'Variable',
      decimalToTime(act.time).formatted
    ]);

    if (communityRows.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text('Desglose de Gestión y Comunidad', 14, (doc as any).lastAutoTable.finalY + 15);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Actividad', 'Tipo', 'Tiempo']],
        body: communityRows,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] }, // amber-500
      });
    }

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text('Generado por JornadaDocente.cl', 14, finalY);

    doc.save(`Jornada_Docente_${teacherName.replace(/\s+/g, '_') || 'Informe'}.pdf`);
  };

  const exportAnswerSheet = () => {
    const doc = new jsPDF();
    const qCount = scannerConfig.questionCount;
    
    doc.setFontSize(16);
    doc.text('HOJA DE RESPUESTAS - ENSAYO SIMCE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text('Nombre:', 20, 35);
    doc.line(35, 35, 100, 35);
    doc.text('Fecha:', 110, 35);
    doc.line(125, 35, 160, 35);

    // Anchor points (corners)
    const margin = 10;
    const s = 4;
    doc.rect(margin, margin, s, s, 'F'); // TL
    doc.rect(210 - margin - s, margin, s, s, 'F'); // TR
    doc.rect(margin, 297 - margin - s, s, s, 'F'); // BL
    doc.rect(210 - margin - s, 297 - margin - s, s, s, 'F'); // BR

    // Bubbles
    const startY = 50;
    const colSpacing = 45;
    const rowSpacing = 8;
    const options = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < qCount; i++) {
        const col = Math.floor(i / 20);
        const row = i % 20;
        const x = 20 + (col * colSpacing);
        const y = startY + (row * rowSpacing);

        doc.setFontSize(8);
        doc.text(`${i + 1}.`, x, y + 2);
        
        options.forEach((opt, oIdx) => {
            const bx = x + 8 + (oIdx * 8);
            doc.circle(bx, y, 2.5, 'S');
            doc.setFontSize(6);
            doc.text(opt, bx, y + 1, { align: 'center' });
        });
    }

    doc.save('Hoja_Respuestas_SIMCE.pdf');
  };

  const processScan = async (silent: boolean = false) => {
    if (!webcamRef.current) return;
    
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    const img = new Image();
    img.src = imageSrc;
    await new Promise(resolve => img.onload = resolve);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;
    
    const findCorner = (startX: number, startY: number, endX: number, endY: number) => {
        let bestX = 0, bestY = 0, maxScore = 0;
        const step = 4; // Faster and more precise step
        
        // Dynamic thresholding: first pass to find average brightness in region
        let totalBrightness = 0;
        let samples = 0;
        for (let y = startY; y < endY; y += 20) {
            for (let x = startX; x < endX; x += 20) {
                const idx = (Math.floor(y) * img.width + Math.floor(x)) * 4;
                totalBrightness += (data[idx] + data[idx+1] + data[idx+2]) / 3;
                samples++;
            }
        }
        const avgRegionBrightness = totalBrightness / samples;
        const localThreshold = avgRegionBrightness * 0.6; // Black should be 40% darker than average

        for (let y = startY + 10; y < endY - 10; y += step) {
            for (let x = startX + 10; x < endX - 10; x += step) {
                const idx = (Math.floor(y) * img.width + Math.floor(x)) * 4;
                const brightness = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                
                if (brightness < localThreshold) {
                    let density = 0;
                    const r = 8; // Larger radius for more stable detection
                    for (let dy = -r; dy <= r; dy += 3) {
                        for (let dx = -r; dx <= r; dx += 3) {
                            const lIdx = (Math.floor(y+dy) * img.width + Math.floor(x+dx)) * 4;
                            if (lIdx >= 0 && lIdx < data.length) {
                                if ((data[lIdx] + data[lIdx+1] + data[lIdx+2]) / 3 < localThreshold) density++;
                            }
                        }
                    }
                    if (density > maxScore) {
                        maxScore = density;
                        bestX = x;
                        bestY = y;
                    }
                }
            }
        }
        return { x: bestX, y: bestY, score: maxScore };
    };

    const q = 0.3; // Search 30% of the screen corners instead of 20%
    const corners = {
        tl: findCorner(0, 0, img.width * q, img.height * q),
        tr: findCorner(img.width * (1-q), 0, img.width, img.height * q),
        bl: findCorner(0, img.height * (1-q), img.width * q, img.height),
        br: findCorner(img.width * (1-q), img.height * (1-q), img.width, img.height)
    };

    const hasAllCorners = Object.values(corners).every(c => c.score > 15);

    // Dynamic Feedback Color
    ctx.fillStyle = hasAllCorners ? '#10b981' : '#f59e0b'; // Green if locked, Amber if hunting
    Object.values(corners).forEach(c => {
        if (c.score > 5) { // Only draw if we found SOMETHING
            ctx.beginPath();
            ctx.arc(c.x, c.y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });

    if (!hasAllCorners) return;

    const detectedAnswers: { [q: number]: string } = {};
    const options = ['A', 'B', 'C', 'D'];
    let confidenceSum = 0;
    
    for (let i = 0; i < scannerConfig.questionCount; i++) {
        const col = Math.floor(i / 20);
        const row = i % 20;

        const tx = (16 + (col * 22)) / 100;
        const ty = (19 + (row * 3.8)) / 100;

        const topX = corners.tl.x + tx * (corners.tr.x - corners.tl.x);
        const topY = corners.tl.y + tx * (corners.tr.y - corners.tl.y);
        const bottomX = corners.bl.x + tx * (corners.br.x - corners.bl.x);
        const bottomY = corners.bl.y + tx * (corners.br.y - corners.bl.y);
        const qX = topX + ty * (bottomX - topX);
        const qY = topY + ty * (bottomY - topY);

        let bestDarkness = -1;
        let detectedOpt = '-';

        options.forEach((opt, oIdx) => {
            const bubbleX = qX + (3.5 + oIdx * 3.6) * (img.width / 100);
            const bubbleY = qY;
            
            const sampleSize = Math.max(2, Math.floor(img.width / 140));
            let totalDark = 0;
            for (let dy = -sampleSize; dy <= sampleSize; dy++) {
                for (let dx = -sampleSize; dx <= sampleSize; dx++) {
                    const sIdx = (Math.floor(bubbleY + dy) * img.width + Math.floor(bubbleX + dx)) * 4;
                    if (sIdx >= 0 && sIdx < data.length) {
                        if ((data[sIdx] + data[sIdx+1] + data[sIdx+2]) / 3 < 110) totalDark++;
                    }
                }
            }

            if (totalDark > bestDarkness) {
                bestDarkness = totalDark;
                detectedOpt = opt;
            }

            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, sampleSize, 0, Math.PI * 2);
            ctx.strokeStyle = totalDark > 8 ? '#3b82f6' : '#cbd5e1';
            ctx.stroke();
        });

        if (bestDarkness > 6) {
            detectedAnswers[i + 1] = detectedOpt;
            confidenceSum++;
        }
    }

    if (!silent || (confidenceSum > scannerConfig.questionCount * 0.8)) {
        setScanResult(detectedAnswers);
        if (confidenceSum > scannerConfig.questionCount * 0.8) {
            setScannerStatus('finished');
        }
    }
  };

  const saveScanToStudent = () => {
    if (!scanResult || !scannerConfig.selectedStudentId) return;
    
    // 1. Calculate scores by category for the target student
    const studentId = scannerConfig.selectedStudentId;
    const appIdx = scannerConfig.activeAppIndex;
    const config = SIMCE_CONFIG[appIdx];
    
    const categoryScores: { [catIdx: number]: number } = {};
    
    config.categories.forEach((cat, catIdx) => {
        const questionsInCat = cat.questions.split('-').map(Number);
        let correctCount = 0;
        
        questionsInCat.forEach(qNum => {
            const userAns = scanResult[qNum];
            const correctAns = scannerConfig.answerKey[qNum];
            if (userAns && correctAns && userAns === correctAns) {
                correctCount++;
            }
        });
        
        categoryScores[catIdx] = correctCount;
    });

    // 2. Update students state
    setStudents(prev => prev.map(s => {
        if (s.id !== studentId) return s;
        const newScores = { ...s.scores };
        newScores[appIdx] = categoryScores;
        return { ...s, scores: newScores };
    }));

    // 3. Reset and switch tab
    setScannerStatus('idle');
    setScanResult(null);
    setActiveTab('simce');
  };
  const totalFixedTime = activities.filter(a => a.isActive && a.fixedTime).reduce((sum, a) => sum + (a.fixedTime || 0), 0);
  const isCommunityOverloaded = totalFixedTime > results.comunidad;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-slate-800">
              JornadaDocente<span className="text-blue-600">.cl</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <User className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Nombre del docente..."
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="bg-transparent border-none outline-none text-sm font-medium w-40 focus:w-60 transition-all"
              />
            </div>
            <button 
              onClick={exportPDF}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Integration */}
      <div className="bg-slate-100 border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-4">
          <button 
            onClick={() => setActiveTab('jornada')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'jornada' 
                ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-4px_0_0_inset_white]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Jornada Docente
          </button>
          <button 
            onClick={() => setActiveTab('simce')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'simce' 
                ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-4px_0_0_inset_white]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Análisis SIMCE
          </button>
          <button 
            onClick={() => setActiveTab('scanner')}
            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'scanner' 
                ? 'border-blue-600 text-blue-600 bg-white shadow-[0_-4px_0_0_inset_white]' 
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Scan className="w-4 h-4" />
            Escáner SIMCE
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'jornada' ? (
            <motion.div 
              key="jornada"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Existing Jornada content starts here */}
              {/* Left Column: Input & Controls */}
              <div className="lg:col-span-5 space-y-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Configuración de Contrato
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Total de Horas de Contrato
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={contractHours || ''}
                      onChange={(e) => setContractHours(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-medium text-lg"
                      placeholder="Ej: 44"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                      Horas
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 font-medium">Horas Aula (HA):</span>
                    <span className="text-xl font-bold text-blue-900">{results.ha} hrs.</span>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1 italic">
                    * Equivalente a {hcTime.formatted} cronológicas.
                  </p>
                </div>
              </div>
            </section>

            {/* Activities Selection */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Actividades de Comunidad
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Selecciona las actividades para distribuir las {comunidadTime.formatted} disponibles.
              </p>
              
              <div className="space-y-2">
                {activities.map((activity) => (
                  <div key={activity.id} className="space-y-2">
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        activity.isActive 
                          ? 'bg-amber-50 border-amber-200 text-amber-900 shadow-sm' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={activity.isActive ? 'text-amber-600' : 'text-slate-300'}>
                          {activity.icon}
                        </div>
                        <span className="text-sm font-medium">{activity.name}</span>
                        {activity.fixedTime && (
                          <span className="text-[10px] bg-amber-200/50 px-1.5 py-0.5 rounded text-amber-700 font-bold">
                            {activity.fixedTime}h fijo
                          </span>
                        )}
                      </div>
                      {activity.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-200" />
                      )}
                    </button>

                    {activity.isActive && ['desarrollo_prof', 'talleres', 'mruta', 'reuniones_depto'].includes(activity.id) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-4"
                      >
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Horas</label>
                          <input 
                            type="number" 
                            min="0"
                            value={activity.customHours ?? 0}
                            onChange={(e) => updateActivityTime(activity.id, 'customHours', Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minutos</label>
                          <input 
                            type="number" 
                            min="0"
                            max="59"
                            value={activity.customMinutes ?? 0}
                            onChange={(e) => updateActivityTime(activity.id, 'customMinutes', Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              {isCommunityOverloaded && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-700 leading-tight">
                    Las horas fijas ({totalFixedTime}h) superan el tiempo disponible ({comunidadTime.formatted}).
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Visualization & Table */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Chart Section */}
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <ChevronRight className="w-5 h-5 text-blue-500" />
                Distribución Visual (Tabla 2019)
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1000}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => decimalToTime(value).formatted}
                    />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Detailed Table */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-100">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  Resumen de Jornada (Proporción 65/35)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest">
                      <th className="px-6 py-4 border-b border-slate-100">Descripción</th>
                      <th className="px-6 py-4 border-b border-slate-100">Sigla</th>
                      <th className="px-6 py-4 border-b border-slate-100">Tiempo Real</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {/* HC */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          Horas Lectivas (Docencia Aula)
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-slate-500 font-mono">HC</td>
                      <td className="px-6 py-4 border-b border-slate-100 font-bold text-blue-600">{hcTime.formatted}</td>
                    </tr>
                    
                    {/* Recreo */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                          Recreos
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-slate-100 text-slate-500 font-mono">R</td>
                      <td className="px-6 py-4 border-b border-slate-100 font-bold text-blue-400">{recreoTime.formatted}</td>
                    </tr>

                    {/* Total No Lectivas */}
                    <tr className="bg-emerald-50/30">
                      <td className="px-6 py-4 font-bold border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          Horas No Lectivas (Disponibles)
                        </div>
                      </td>
                      <td className="px-6 py-4 border-b border-emerald-100 text-slate-500 font-mono">HNL</td>
                      <td className="px-6 py-4 border-b border-emerald-100 font-bold text-emerald-600">{totalNoLectivasTime.formatted}</td>
                    </tr>

                    {/* PEA */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="pl-12 pr-6 py-3 border-b border-slate-100 text-slate-600">
                        Preparación y Evaluación (50% HNL)
                      </td>
                      <td className="px-6 py-3 border-b border-slate-100 text-slate-400 font-mono">PEA</td>
                      <td className="px-6 py-3 border-b border-slate-100 font-medium text-slate-700">{peaTime.formatted}</td>
                    </tr>
                    
                    {/* Comunidad */}
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="pl-12 pr-6 py-3 border-b border-slate-100 text-slate-600">
                        Gestión y Comunidad (50% HNL)
                      </td>
                      <td className="px-6 py-3 border-b border-slate-100 text-slate-400 font-mono">GC</td>
                      <td className="px-6 py-3 border-b border-slate-100 font-medium text-slate-700">{comunidadTime.formatted}</td>
                    </tr>
                    
                    {communityDistribution.map((act) => (
                      <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="pl-16 pr-6 py-2 border-b border-slate-50 text-slate-500 text-xs flex items-center gap-2">
                          {act.name}
                        </td>
                        <td className="px-6 py-2 border-b border-slate-50 text-slate-400 text-[10px] italic">
                          {act.fixedTime ? 'Fijo' : 'Var.'}
                        </td>
                        <td className="px-6 py-2 border-b border-slate-50 font-medium text-slate-600 text-xs">
                          {decimalToTime(act.time).formatted}
                        </td>
                      </tr>
                    ))}

                    <tr className="bg-slate-50/80 font-bold">
                      <td className="px-6 py-4">Total Contrato</td>
                      <td className="px-6 py-4"></td>
                      <td className="px-6 py-4 text-slate-900">{decimalToTime(results.totalHours).formatted}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
            </div>
          </motion.div>
        ) : activeTab === 'simce' ? (
          <motion.div 
            key="simce"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
          >
            {/* SIMCE Analysis Section */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <FileSpreadsheet className="w-6 h-6 text-emerald-500" />
                    Análisis Ensayos Tipo SIMCE
                  </h2>
                  <p className="text-sm text-slate-500 font-medium">Control de habilidades y progreso por estudiante</p>
                </div>
                <button 
                  onClick={addStudent}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Añadir Estudiante
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Establecimiento</label>
                  <input 
                    type="text" 
                    value={schoolInfo.establishment}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, establishment: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Curso</label>
                  <input 
                    type="text" 
                    value={schoolInfo.course}
                    onChange={(e) => setSchoolInfo(prev => ({ ...prev, course: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto -mx-8">
                <div className="min-w-[1200px] px-8">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50">
                        <th rowSpan={2} className="p-4 border border-slate-200 text-xs font-bold text-slate-500 text-left w-64">Nombre del Estudiante</th>
                        {SIMCE_CONFIG.map((app, appIdx) => (
                          <th key={appIdx} colSpan={app.categories.length * 2} className="p-2 border border-slate-200 text-[10px] font-black uppercase text-center bg-slate-100 text-slate-600">
                            {app.name}
                          </th>
                        ))}
                        <th rowSpan={2} className="p-2 border border-slate-200"></th>
                      </tr>
                      <tr className="bg-slate-50">
                        {SIMCE_CONFIG.map((app, appIdx) => (
                          <React.Fragment key={appIdx}>
                            {app.categories.map((cat, catIdx) => (
                              <React.Fragment key={catIdx}>
                                <th className="p-2 border border-slate-200 text-[9px] font-bold text-slate-500 w-20 text-center leading-tight">
                                  {cat.name}
                                  <div className="text-[8px] opacity-60 font-normal">Total: {cat.total}</div>
                                </th>
                                <th className="p-2 border border-slate-200 text-[9px] font-bold text-emerald-600 w-16 text-center">%</th>
                              </React.Fragment>
                            ))}
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-2 border border-slate-200">
                            <input 
                              type="text"
                              placeholder="Ingresar nombre..."
                              value={student.name}
                              onChange={(e) => updateStudentName(student.id, e.target.value)}
                              className="w-full bg-transparent border-none outline-none text-sm font-medium focus:text-blue-600"
                            />
                          </td>
                          {SIMCE_CONFIG.map((app, appIdx) => (
                            <React.Fragment key={appIdx}>
                              {app.categories.map((cat, catIdx) => {
                                const score = student.scores[appIdx]?.[catIdx] || 0;
                                const percentage = cat.total > 0 ? (score / cat.total) * 100 : 0;
                                return (
                                  <React.Fragment key={catIdx}>
                                    <td className="p-2 border border-slate-200 text-center">
                                      <input 
                                        type="number"
                                        min="0"
                                        max={cat.total}
                                        value={score || ''}
                                        onChange={(e) => updateStudentScore(student.id, appIdx, catIdx, Number(e.target.value))}
                                        className="w-12 bg-white border border-slate-100 rounded text-center text-sm font-bold focus:border-emerald-500 outline-none"
                                        placeholder="0"
                                      />
                                    </td>
                                    <td className={`p-2 border border-slate-200 text-center text-[10px] font-bold ${percentage >= 80 ? 'text-emerald-500' : percentage >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                      {cat.total > 0 ? `${percentage.toFixed(1)}%` : '-'}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <td className="p-2 border border-slate-200 text-center">
                            <button 
                              onClick={() => removeStudent(student.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex gap-4">
              <div className="bg-blue-600 p-2 h-fit rounded-lg shadow-sm">
                <Info className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-blue-900 text-sm">Instrucciones del Analizador</h4>
                <p className="text-xs text-blue-700 leading-relaxed max-w-2xl">
                  Ingresa solo el número de respuestas correctas en cada casilla. El sistema calculará el porcentaje basado en los requerimientos del ensayo.
                  Los colores indican el nivel de logro: <span className="text-emerald-600 font-bold">Verde (80%+)</span>, <span className="text-amber-600 font-bold">Ámbar (50-79%)</span>, <span className="text-red-600 font-bold">Rojo (&lt;50%)</span>.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Configuration Panel */}
                <div className="space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Save className="w-5 h-5 text-blue-500" />
                        Configuración Escaneo
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Ensayo a Corregir</label>
                            <select 
                                value={scannerConfig.activeAppIndex}
                                onChange={(e) => setScannerConfig(prev => ({ ...prev, activeAppIndex: Number(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                            >
                                {SIMCE_CONFIG.map((app, idx) => (
                                    <option key={idx} value={idx}>{app.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400">Preguntas</label>
                            <select 
                                value={scannerConfig.questionCount}
                                onChange={(e) => setScannerConfig(prev => ({ ...prev, questionCount: Number(e.target.value) }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm outline-none"
                            >
                                <option value={20}>20 Preguntas</option>
                                <option value={30}>30 Preguntas</option>
                                <option value={40}>40 Preguntas</option>
                                <option value={60}>60 Preguntas</option>
                            </select>
                        </div>
                        <button 
                            onClick={exportAnswerSheet}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 text-white p-3 rounded-xl text-sm font-bold hover:bg-slate-900 transition-all"
                        >
                            <Printer className="w-4 h-4" />
                            Generar Hoja Imprimible
                        </button>
                    </div>
                  </section>

                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <MousePointer2 className="w-5 h-5 text-emerald-500" />
                        Clave de Respuestas
                    </h3>
                    <div className="grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {Array.from({ length: scannerConfig.questionCount }).map((_, i) => {
                            const q = i + 1;
                            return (
                                <div key={q} className="flex flex-col gap-1 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400">{q}</span>
                                    <select 
                                        value={scannerConfig.answerKey[q] || ''}
                                        onChange={(e) => setScannerConfig(prev => ({
                                            ...prev,
                                            answerKey: { ...prev.answerKey, [q]: e.target.value }
                                        }))}
                                        className="bg-transparent text-[11px] font-black outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">-</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                  </section>
                </div>

                {/* Camera / Processor Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Camera className="w-5 h-5 text-blue-500" />
                                Captura de Imagen
                            </h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setScannerStatus('idle')}
                                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="relative aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden shadow-inner border-4 border-slate-800">
                            {scannerStatus !== 'finished' ? (
                                <>
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        mirrored={false}
                                        className={`w-full h-full object-cover transition-opacity duration-500 ${scannerStatus === 'scanning' ? 'opacity-40' : 'opacity-80'}`}
                                        videoConstraints={{ facingMode: "environment" }}
                                    />
                                    
                                    <canvas 
                                        ref={canvasRef}
                                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                    />

                                    {scannerStatus === 'idle' ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                            <div className="w-64 h-80 border-2 border-dashed border-white/40 rounded-xl mb-6 flex items-center justify-center">
                                                <Scan className="w-12 h-12 text-white/20" />
                                            </div>
                                            <button 
                                                onClick={() => setScannerStatus('scanning')}
                                                className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl text-lg font-black shadow-xl hover:scale-105 active:scale-95 transition-all"
                                            >
                                                <Camera className="w-6 h-6" />
                                                INICIAR ESCÁNER
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-full text-[10px] font-bold tracking-widest flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                            BUSCANDO MARCADORES...
                                        </div>
                                    )}
                                </>
                            ) : (
                                <canvas 
                                    ref={canvasRef}
                                    className="w-full h-full object-contain bg-white"
                                />
                            )}
                        </div>

                        {scanResult && scannerStatus === 'finished' && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="font-bold flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        Detección de Respuestas
                                    </h4>
                                    <div className="flex gap-2">
                                        <select 
                                            value={scannerConfig.selectedStudentId}
                                            onChange={(e) => setScannerConfig(prev => ({ ...prev, selectedStudentId: e.target.value }))}
                                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm"
                                        >
                                            <option value="">Seleccionar Estudiante...</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.name || 'Sin nombre'}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={saveScanToStudent}
                                            disabled={!scannerConfig.selectedStudentId}
                                            className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-black shadow-md hover:bg-emerald-700 disabled:opacity-50 transition-all"
                                        >
                                            SINCRONIZAR
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
                                    {Object.entries(scanResult).map(([q, res]) => (
                                        <div key={q} className={`flex flex-col items-center bg-white border p-1 rounded ${res === scannerConfig.answerKey[Number(q)] ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200'}`}>
                                            <span className="text-[8px] text-slate-400 font-bold">{q}</span>
                                            <span className="text-xs font-black">{res}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </section>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 py-12 border-t border-slate-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-slate-400 text-sm">
          <p>© 2026 Herramienta de Cálculo Docente. Basado en Tabla 2019 (65/35).</p>
        </div>
      </footer>
    </div>
  );
}
