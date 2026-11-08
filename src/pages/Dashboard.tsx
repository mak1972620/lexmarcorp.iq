import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Scale, 
  Clock, 
  Calendar, 
  Award, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Cpu, 
  Calculator, 
  Brain, 
  FileSpreadsheet, 
  Plus, 
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { cn } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'todos' | 'legal' | 'contable' | 'psicologico'>('todos');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Casos iniciales o combinados con la base de datos
  const defaultCases = [
    {
      exp: 'EXP-2026-089',
      client: 'García & Hijos S.A. de C.V.',
      court: 'Mercantil - Juzgado 1° Civil',
      stage: 'Desahogo de Pruebas',
      status: 'Activo',
      type: 'legal'
    },
    {
      exp: 'EXP-2026-104',
      client: 'Martínez Ramírez, Sofía',
      court: 'Familiar - Juzgado 2° Familiar',
      stage: 'Dictamen Psicológico Pendiente',
      status: 'En Proceso',
      type: 'psicologico'
    },
    {
      exp: 'EXP-2026-112',
      client: 'Transportes del Norte S.R.L.',
      court: 'Fiscal / Contable',
      stage: 'Auditoría Financiera',
      status: 'Revisión',
      type: 'contable'
    },
    {
      exp: 'EXP-2026-120',
      client: 'Inmobiliaria Peninsular S.A.',
      court: 'Civil - Juzgado 3° Distrito',
      stage: 'Sentencia Definitiva',
      status: 'Activo',
      type: 'legal'
    }
  ];

  const filteredCases = activeTab === 'todos' 
    ? defaultCases 
    : defaultCases.filter(c => c.type === activeTab);

  return (
    <div className="space-y-8 select-none">
      {/* ==========================================
          HEADER PRINCIPAL
          ========================================== */}
      <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="font-['Cinzel'] text-2xl md:text-3xl font-bold tracking-[0.5px] text-gold-gradient">
            Panel de Control Legal & Ejecutivo
          </h1>
          <p className="text-[13px] text-[#8E95A5] mt-1">
            Gestión integral de asuntos jurídicos, contables y dictámenes psicológicos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/documentos')}
            className="btn-outline-gold"
          >
            <FileSpreadsheet size={16} />
            Generar Reporte
          </button>
          <button 
            onClick={() => navigate('/expedientes')}
            className="btn-gold"
          >
            <Plus size={16} />
            Nuevo Expediente
          </button>
        </div>
      </header>

      {/* ==========================================
          GRID DE TARJETAS DE INDICADORES (KPIS)
          ========================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:border-[#D4AF37] hover:shadow-[0_8px_30px_rgba(212,175,55,0.12)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[1px] text-[#8E95A5] uppercase font-bold">
              Expedientes Activos
            </span>
            <Scale size={20} className="text-[#D4AF37]" />
          </div>
          <div className="font-['Cinzel'] text-3xl font-bold text-[#F3F4F6]">
            {stats?.kpis?.totalCases || 142}
          </div>
          <div className="text-xs text-[#D4AF37] mt-1.5 flex items-center gap-1 font-medium">
            <TrendingUp size={14} />
            <span>12 en fase procesal crítica</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:border-[#D4AF37] hover:shadow-[0_8px_30px_rgba(212,175,55,0.12)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[1px] text-[#8E95A5] uppercase font-bold">
              Próximos Vencimientos
            </span>
            <Clock size={20} className="text-[#D4AF37]" />
          </div>
          <div className="font-['Cinzel'] text-3xl font-bold text-[#F3F4F6]">
            {stats?.kpis?.pendingTasks || 8}
          </div>
          <div className="text-xs text-[#D4AF37] mt-1.5 flex items-center gap-1 font-medium">
            <AlertCircle size={14} />
            <span>3 términos vencen en &lt; 24h</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:border-[#D4AF37] hover:shadow-[0_8px_30px_rgba(212,175,55,0.12)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[1px] text-[#8E95A5] uppercase font-bold">
              Audiencias Programadas
            </span>
            <Calendar size={20} className="text-[#D4AF37]" />
          </div>
          <div className="font-['Cinzel'] text-3xl font-bold text-[#F3F4F6]">
            5
          </div>
          <div className="text-xs text-[#D4AF37] mt-1.5 flex items-center gap-1 font-medium">
            <Clock size={14} />
            <span>Próxima: Mañana 10:00 AM</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] hover:border-[#D4AF37] hover:shadow-[0_8px_30px_rgba(212,175,55,0.12)] transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] tracking-[1px] text-[#8E95A5] uppercase font-bold">
              Dictámenes Contables/Psic.
            </span>
            <Award size={20} className="text-[#D4AF37]" />
          </div>
          <div className="font-['Cinzel'] text-3xl font-bold text-[#F3F4F6]">
            29
          </div>
          <div className="text-xs text-[#D4AF37] mt-1.5 flex items-center gap-1 font-medium">
            <CheckCircle2 size={14} />
            <span>100% Auditados</span>
          </div>
        </div>
      </div>

      {/* ==========================================
          SECCIÓN HERRAMIENTAS EJECUTIVAS
          ========================================== */}
      <div>
        <h2 className="font-['Cinzel'] text-sm tracking-[1px] text-[#FFF3A7] uppercase mb-4 font-bold">
          Herramientas Ejecutivas & Automatizaciones
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div 
            onClick={() => navigate('/auditor')}
            className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:border-[#D4AF37] hover:bg-[#141720] transition-all duration-300 group shadow-lg"
          >
            <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/22 flex items-center justify-center text-[#D4AF37] shrink-0 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
              <Cpu size={22} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F3F4F6] mb-1 group-hover:text-[#FFF3A7] transition-colors">
                Redactor Legal IA
              </h3>
              <p className="text-xs text-[#8E95A5] leading-relaxed">
                Generación automática de demandas, contestaciones y contratos con jurisprudencia local.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div 
            onClick={() => navigate('/liquidacion')}
            className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:border-[#D4AF37] hover:bg-[#141720] transition-all duration-300 group shadow-lg"
          >
            <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/22 flex items-center justify-center text-[#D4AF37] shrink-0 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
              <Calculator size={22} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F3F4F6] mb-1 group-hover:text-[#FFF3A7] transition-colors">
                Auditoría Fiscal & Peritajes
              </h3>
              <p className="text-xs text-[#8E95A5] leading-relaxed">
                Cálculo de finiquitos, partidas contables e impuestos en expedientes mercantiles.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div 
            onClick={() => navigate('/duelo-procesal')}
            className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-5 flex items-start gap-4 cursor-pointer hover:border-[#D4AF37] hover:bg-[#141720] transition-all duration-300 group shadow-lg"
          >
            <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/22 flex items-center justify-center text-[#D4AF37] shrink-0 group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
              <Brain size={22} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F3F4F6] mb-1 group-hover:text-[#FFF3A7] transition-colors">
                Peritaje Psicológico
              </h3>
              <p className="text-xs text-[#8E95A5] leading-relaxed">
                Módulo de evaluación y emisión de dictámenes clínicos para materia familiar.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          TABLA DE EXPEDIENTES Y CASOS
          ========================================== */}
      <div className="bg-[#0d0f14] border border-[#D4AF37]/22 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="font-['Cinzel'] text-sm tracking-[1px] text-[#FFF3A7] uppercase font-bold m-0">
            Control de Expedientes y Casos
          </h2>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('todos')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer",
                activeTab === 'todos'
                  ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFF3A7] font-semibold"
                  : "text-[#8E95A5] hover:text-[#F3F4F6]"
              )}
            >
              Todos (142)
            </button>
            <button 
              onClick={() => setActiveTab('legal')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer",
                activeTab === 'legal'
                  ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFF3A7] font-semibold"
                  : "text-[#8E95A5] hover:text-[#F3F4F6]"
              )}
            >
              Área Legal
            </button>
            <button 
              onClick={() => setActiveTab('contable')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer",
                activeTab === 'contable'
                  ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFF3A7] font-semibold"
                  : "text-[#8E95A5] hover:text-[#F3F4F6]"
              )}
            >
              Contable
            </button>
            <button 
              onClick={() => setActiveTab('psicologico')}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer",
                activeTab === 'psicologico'
                  ? "bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FFF3A7] font-semibold"
                  : "text-[#8E95A5] hover:text-[#F3F4F6]"
              )}
            >
              Psicológico
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-[#D4AF37]/22">
                <th className="text-[11px] uppercase tracking-[1px] text-[#5C6270] py-3 px-4 font-bold">N° Expediente</th>
                <th className="text-[11px] uppercase tracking-[1px] text-[#5C6270] py-3 px-4 font-bold">Cliente / Actor</th>
                <th className="text-[11px] uppercase tracking-[1px] text-[#5C6270] py-3 px-4 font-bold">Materia / Juzgado</th>
                <th className="text-[11px] uppercase tracking-[1px] text-[#5C6270] py-3 px-4 font-bold">Etapa Procesal</th>
                <th className="text-[11px] uppercase tracking-[1px] text-[#5C6270] py-3 px-4 font-bold text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredCases.map((c, i) => (
                <tr key={i} className="hover:bg-white/[0.015] transition-colors">
                  <td className="py-4 px-4 text-xs font-mono font-bold text-[#FFF3A7]">
                    {c.exp}
                  </td>
                  <td className="py-4 px-4 text-xs font-semibold text-[#F3F4F6]">
                    {c.client}
                  </td>
                  <td className="py-4 px-4 text-xs text-[#8E95A5]">
                    {c.court}
                  </td>
                  <td className="py-4 px-4 text-xs text-[#F3F4F6]">
                    {c.stage}
                  </td>
                  <td className="py-4 px-4 text-xs text-right">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#D4AF37]/15 text-[#FFF3A7] border border-[#D4AF37]/25 inline-block">
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
