"use client";

import { useState } from "react";
import Link from "next/link";
import WeeklyMatchesAdmin from "../../../components/admin/WeeklyMatchesAdmin";

export default function FeaturedMatchesAdminPage() {
  const [season, setSeason] = useState(3);
  const [password, setPassword] = useState("");
  return (
    <main className="min-h-screen bg-[#030711] px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-bold text-blue-300 hover:text-blue-200">← Адмін-панель</Link>
        <h1 className="mt-6 text-3xl font-black">Матчі тижня Iron League</h1>
        <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-[#07101d] p-5 sm:grid-cols-2">
          <div><label className="text-xs font-bold text-white/60">Пароль адміністратора</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Пароль"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3"/></div>
          <div><label className="text-xs font-bold text-white/60">Сезон</label>
            <select value={season} onChange={e => setSeason(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#030711] px-4 py-3">
              {[1,2,3,4].map(value => <option key={value} value={value}>Сезон {value}</option>)}
            </select></div>
        </div>
        <WeeklyMatchesAdmin season={season} password={password}/>
      </div>
    </main>
  );
}
