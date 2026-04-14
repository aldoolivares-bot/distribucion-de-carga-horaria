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
  Utensils
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

export default function App() {
  const [contractHours, setContractHours] = useState<number>(44);
  const [teacherName, setTeacherName] = useState<string>('');

  // Community Activities State
  const [activities, setActivities] = useState<CommunityActivity[]>([
    { id: 'apoderados', name: 'Atención Apoderados', icon: <UserCheck className="w-4 h-4" />, fixedTime: 1, isActive: true },
    { id: 'consejo_tecnico', name: 'Consejo Técnico', icon: <Users className="w-4 h-4" />, fixedTime: 1.5, isActive: true },
    { id: 'talleres', name: 'Talleres', icon: <PenTool className="w-4 h-4" />, isActive: true },
    { id: 'libro_digital', name: 'Libro Digital', icon: <Book className="w-4 h-4" />, isActive: true },
    { id: 'reuniones_depto', name: 'Reuniones Departamento', icon: <Briefcase className="w-4 h-4" />, fixedTime: 1, isActive: true },
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
    // --- Tabla 2019 Logic (65/35) ---
    // 1. Calculate Pedagogical Hours (HA) as 65% of contract
    // 1 HA = 45 min = 0.75 hours
    const ha = Math.round((contractHours * 0.65) / 0.75);
    
    // 2. Convert HA to Chronological Hours (HC)
    const hc = ha * 0.75;
    
    // 3. Calculate Recess (Recreo)
    // Based on the 2019 table ratio: 44h contract -> 38 HA -> 3h Recess
    // Ratio = 3 / 38
    const recreo = ha * (3 / 38);
    
    // 4. Calculate Total No Lectivas (Effective for PEA + Community)
    // Contract = HC + Recreo + NoLectivas
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
    
    // Fixed activities are those with fixedTime OR those with custom inputs (like Desarrollo Prof)
    const fixedActivities = activeActivities.filter(a => 
      a.fixedTime !== undefined || 
      (a.id === 'desarrollo_prof' && (a.customHours !== undefined || a.customMinutes !== undefined))
    );
    
    const variableActivities = activeActivities.filter(a => 
      a.fixedTime === undefined && 
      !(a.id === 'desarrollo_prof' && (a.customHours !== undefined || a.customMinutes !== undefined))
    );

    const totalFixedTime = fixedActivities.reduce((sum, a) => {
      if (a.fixedTime !== undefined) return sum + a.fixedTime;
      if (a.id === 'desarrollo_prof') {
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
      if (a.id === 'desarrollo_prof' && (a.customHours !== undefined || a.customMinutes !== undefined)) {
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

    // Main Table
    autoTable(doc, {
      startY: 55,
      head: [['Descripción', 'Sigla', 'Tiempo Real']],
      body: [
        ['Horas Lectivas (Docencia Aula)', 'HC', hcTime.formatted],
        ['Recreos', 'R', recreoTime.formatted],
        ['Horas No Lectivas (Disponibles)', 'HNL', totalNoLectivasTime.formatted],
        ['  - Preparación y Evaluación (50% HNL)', 'PEA', peaTime.formatted],
        ['  - Gestión y Comunidad (50% HNL)', 'GC', comunidadTime.formatted],
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

  // Warning for community time overflow
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
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

                    {activity.isActive && activity.id === 'desarrollo_prof' && (
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
        </div>
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
