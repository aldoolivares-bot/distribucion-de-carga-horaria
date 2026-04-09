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
  Lightbulb
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

  // Community Activities State
  const [activities, setActivities] = useState<CommunityActivity[]>([
    { id: 'apoderados', name: 'Atención Apoderados', icon: <UserCheck className="w-4 h-4" />, fixedTime: 1, isActive: true },
    { id: 'consejo_tecnico', name: 'Consejo Técnico', icon: <Users className="w-4 h-4" />, fixedTime: 1.5, isActive: true },
    { id: 'talleres', name: 'Talleres', icon: <PenTool className="w-4 h-4" />, isActive: true },
    { id: 'libro_digital', name: 'Libro Digital', icon: <Book className="w-4 h-4" />, isActive: true },
    { id: 'reuniones_depto', name: 'Reuniones Departamento', icon: <Briefcase className="w-4 h-4" />, fixedTime: 1, isActive: true },
    { id: 'desarrollo_prof', name: 'Desarrollo Profesional Docente', icon: <Lightbulb className="w-4 h-4" />, fixedTime: 1, isActive: true },
    { id: 'consejo_adm', name: 'Consejo Administrativo', icon: <ShieldCheck className="w-4 h-4" />, fixedTime: 1.5, isActive: false },
    { id: 'ceal', name: 'CEAL', icon: <GraduationCap className="w-4 h-4" />, isActive: false },
  ]);

  const toggleActivity = (id: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, isActive: !a.isActive } : a));
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
    const fixedActivities = activeActivities.filter(a => a.fixedTime !== undefined);
    const variableActivities = activeActivities.filter(a => a.fixedTime === undefined);

    const totalFixedTime = fixedActivities.reduce((sum, a) => sum + (a.fixedTime || 0), 0);
    const remainingTime = Math.max(0, results.comunidad - totalFixedTime);
    const timePerVariable = variableActivities.length > 0 ? remainingTime / variableActivities.length : 0;

    return activeActivities.map(a => ({
      ...a,
      time: a.fixedTime !== undefined ? a.fixedTime : timePerVariable
    }));
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
          <div className="hidden sm:flex items-center gap-4 text-sm text-slate-500 font-medium">
            <span className="flex items-center gap-1"><Info className="w-4 h-4" /> Tabla 2019 (65/35)</span>
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
                  <button
                    key={activity.id}
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
