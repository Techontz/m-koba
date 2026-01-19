import React, { useState, useMemo } from 'react';
import { Contribution, Month, UserRole, Profile } from '../types';
import { History, FileSpreadsheet, FileText, Plus } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ContributionTableProps {
  members: Profile[];
  contributions: Contribution[];
  enabledMonths: Month[];
  userRole: UserRole;
  selectedPeriodId: string | null;
  onUpdateContribution: (memberId: string, month: Month, amount: number) => Promise<void>;
  onAddMonth: (month: Month) => void; // ✅ NEW
}

/* ================= HELPERS ================= */

function nextMonth(month: Month): Month {
  const [y, m] = month.split('-').map(Number);
  if (m === 12) return `${y + 1}-01`;
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

const ContributionTable: React.FC<ContributionTableProps> = ({
  members,
  contributions,
  enabledMonths,
  userRole,
  selectedPeriodId,
  onUpdateContribution,
  onAddMonth,
}) => {
  const [editing, setEditing] = useState<{ memberId: string; month: Month } | null>(null);
  const [value, setValue] = useState('');

  /* ================= PERMISSIONS ================= */

  const canEdit =
    !!selectedPeriodId &&
    (userRole === 'mweka_hazina' || userRole === 'mwenyekiti');

  /* ================= TOTAL HELPERS ================= */

  const getAmount = (memberId: string, month: Month) =>
    contributions.find(c => c.member_id === memberId && c.month === month)?.amount || 0;

  const memberTotal = (memberId: string) =>
    enabledMonths.reduce((sum, m) => sum + getAmount(memberId, m), 0);

  const monthTotal = (month: Month) =>
    members.reduce((sum, m) => sum + getAmount(m.id, month), 0);

  const grandTotal = members.reduce((sum, m) => sum + memberTotal(m.id), 0);

  /* ================= EXPORT ================= */

  const [exportFrom, setExportFrom] = useState<Month>(enabledMonths[0]);
  const [exportTo, setExportTo] = useState<Month>(
    enabledMonths[enabledMonths.length - 1]
  );

  const exportMonths = useMemo(() => {
    const start = enabledMonths.indexOf(exportFrom);
    const end = enabledMonths.indexOf(exportTo);
    return enabledMonths.slice(start, end + 1);
  }, [exportFrom, exportTo, enabledMonths]);

  const downloadExcel = () => {
    const rows = members.map(m => {
      const row: any = { Name: m.name };
      exportMonths.forEach(month => (row[month] = getAmount(m.id, month)));
      row.Total = exportMonths.reduce((s, mo) => s + getAmount(m.id, mo), 0);
      return row;
    });

    rows.push({
      Name: 'GRAND TOTAL',
      ...Object.fromEntries(exportMonths.map(m => [m, monthTotal(m)])),
      Total: rows.reduce((s, r) => s + r.Total, 0),
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payments');
    saveAs(new Blob([XLSX.write(wb, { type: 'array' })]), 'MKoba_Payments.xlsx');
  };

  const downloadPDF = () => {
    const doc = new jsPDF('landscape');

    autoTable(doc, {
      head: [['Name', ...exportMonths, 'Total']],
      body: [
        ...members.map(m => [
          m.name,
          ...exportMonths.map(month => getAmount(m.id, month).toLocaleString()),
          memberTotal(m.id).toLocaleString(),
        ]),
        [
          'GRAND TOTAL',
          ...exportMonths.map(m => monthTotal(m).toLocaleString()),
          grandTotal.toLocaleString(),
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save('MKoba_Payments.pdf');
  };

  /* ================= RENDER ================= */

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl overflow-hidden">

      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-b bg-slate-50">
        <div className="flex items-center gap-2">
          <History size={18} className="text-indigo-600" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-600">
            Payments Ledger
          </span>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={exportFrom}
            onChange={e => setExportFrom(e.target.value as Month)}
            className="px-3 py-2 rounded-xl border font-bold text-xs"
          >
            {enabledMonths.map(m => <option key={m}>{m}</option>)}
          </select>

          <span className="font-black text-xs">→</span>

          <select
            value={exportTo}
            onChange={e => setExportTo(e.target.value as Month)}
            className="px-3 py-2 rounded-xl border font-bold text-xs"
          >
            {enabledMonths.map(m => <option key={m}>{m}</option>)}
          </select>

          <button onClick={downloadExcel} className="p-2 bg-emerald-600 text-white rounded-xl">
            <FileSpreadsheet size={16} />
          </button>

          <button onClick={downloadPDF} className="p-2 bg-slate-900 text-white rounded-xl">
            <FileText size={16} />
          </button>

          {canEdit && (
            <button
              onClick={() => onAddMonth(nextMonth(enabledMonths.at(-1)!))}
              className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs"
            >
              <Plus size={14} /> Add Month
            </button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="p-4 text-left font-black uppercase text-xs">Member</th>
              {enabledMonths.map(m => (
                <th key={m} className="p-4 text-center font-black text-xs">{m}</th>
              ))}
              <th className="p-4 text-center font-black text-xs text-indigo-600">TOTAL</th>
            </tr>
          </thead>

          <tbody>
            {members.map(member => (
              <tr key={member.id} className="border-t hover:bg-slate-50">
                <td className="p-4 font-bold">{member.name}</td>

                {enabledMonths.map(month => {
                  const amount = getAmount(member.id, month);
                  const isEditing =
                    editing?.memberId === member.id && editing?.month === month;

                  return (
                    <td
                      key={month}
                      className="p-2 text-center cursor-pointer"
                      onClick={() => {
                        if (!canEdit) return;
                        setEditing({ memberId: member.id, month });
                        setValue(amount.toString());
                      }}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          value={value}
                          onChange={e => setValue(e.target.value)}
                          onBlur={async () => {
                            await onUpdateContribution(member.id, month, Number(value));
                            setEditing(null);
                          }}
                          className="w-20 text-center border rounded-lg font-bold"
                        />
                      ) : (
                        <span className="font-bold">
                          {amount > 0 ? amount.toLocaleString() : '—'}
                        </span>
                      )}
                    </td>
                  );
                })}

                <td className="p-4 text-center font-black text-indigo-700">
                  {memberTotal(member.id).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="bg-slate-900 text-white">
            <tr>
              <td className="p-4 font-black">GRAND TOTAL</td>
              {enabledMonths.map(m => (
                <td key={m} className="p-4 text-center font-black">
                  {monthTotal(m).toLocaleString()}
                </td>
              ))}
              <td className="p-4 text-center text-xl font-black">
                {grandTotal.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ContributionTable;
