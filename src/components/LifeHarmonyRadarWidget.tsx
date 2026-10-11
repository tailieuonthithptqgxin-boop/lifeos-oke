import React from 'react';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';
import { Sparkles, Trophy, ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';
import { LifeHarmonyOverview } from '../lib/lifeHarmonyEngine';

export interface LifeHarmonyRadarWidgetProps {
  harmony: LifeHarmonyOverview;
  onExploreGoals?: () => void;
  className?: string;
}

export const LifeHarmonyRadarWidget: React.FC<LifeHarmonyRadarWidgetProps> = ({
  harmony,
  onExploreGoals,
  className = ''
}) => {
  const radarData = harmony.dimensions.map(d => ({
    subject: d.name,
    score: d.score,
    fullMark: d.fullMark
  }));

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'from-emerald-400 to-teal-500 text-white';
    if (score >= 60) return 'from-purple-400 to-indigo-500 text-white';
    return 'from-amber-400 to-orange-500 text-white';
  };

  return (
    <div className={`card-cute rounded-3xl p-5 sm:p-6 bg-white/95 dark:bg-slate-900/90 border border-purple-100/80 dark:border-purple-950/40 shadow-sm relative overflow-hidden ${className}`}>
      {/* Ambient background glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10 border-b border-purple-50 dark:border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-800 dark:text-white tracking-tight">
                Chỉ Số Cân Bằng Cuộc Sống
              </h3>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300">
                5D Harmony
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {harmony.rankTitle}
            </p>
          </div>
        </div>

        {/* Big Overall Score Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-2xl bg-gradient-to-r ${getScoreBadgeColor(harmony.overallScore)} font-black text-sm shadow-xs flex items-center gap-1.5`}>
            <Sparkles className="w-4 h-4" />
            <span>{harmony.overallScore}/100</span>
          </div>
        </div>
      </div>

      {/* Radar Chart + Dimension Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-3 relative z-10">
        {/* Radar Visual */}
        <div className="md:col-span-7 h-56 w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="Điểm"
                dataKey="score"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                fill="#c084fc"
                fillOpacity={0.45}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 5-Dimension Mini Cards */}
        <div className="md:col-span-5 space-y-2">
          {harmony.dimensions.map((dim) => (
            <div 
              key={dim.dimension} 
              className="flex items-center justify-between p-2 rounded-xl bg-purple-50/50 dark:bg-slate-800/50 border border-purple-100/50 dark:border-slate-800 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  {dim.name}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {dim.insight}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-black shrink-0">
                <span className="text-purple-600 dark:text-purple-400">{dim.score}</span>
                <span className="px-1.5 py-0.2 rounded-md bg-white dark:bg-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300">
                  {dim.grade}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
