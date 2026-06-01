import { useDashboardData } from '@/hooks/useDashboardData';
import type { Testeingabe } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/StatCard';
import { TesteingabeDialog } from '@/components/dialogs/TesteingabeDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconPlus, IconPencil, IconTrash, IconSearch,
  IconUser, IconMail, IconPhone, IconCalendar, IconFileText,
  IconUsers,
} from '@tabler/icons-react';

const APPGROUP_ID = '6a1dd48544985968a347bdd0';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const { testeingabe, loading, error, fetchAll } = useDashboardData();

  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<Testeingabe | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Testeingabe | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return testeingabe;
    const q = search.toLowerCase();
    return testeingabe.filter(r =>
      (r.fields.vorname ?? '').toLowerCase().includes(q) ||
      (r.fields.nachname ?? '').toLowerCase().includes(q) ||
      (r.fields.email ?? '').toLowerCase().includes(q) ||
      (r.fields.telefon ?? '').toLowerCase().includes(q)
    );
  }, [testeingabe, search]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return testeingabe.filter(r => {
      if (!r.fields.datum) return false;
      try {
        const d = new Date(r.fields.datum);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      } catch { return false; }
    }).length;
  }, [testeingabe]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Testeingaben</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Alle Einträge verwalten</p>
        </div>
        <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }} className="shrink-0 w-full sm:w-auto">
          <IconPlus size={16} className="mr-2 shrink-0" />
          Neue Eingabe
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          title="Einträge gesamt"
          value={String(testeingabe.length)}
          description="Alle Testeingaben"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Diesen Monat"
          value={String(thisMonth)}
          description="Neue Einträge"
          icon={<IconCalendar size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Mit E-Mail"
          value={String(testeingabe.filter(r => r.fields.email).length)}
          description="E-Mail hinterlegt"
          icon={<IconMail size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0" />
        <Input
          placeholder="Suchen nach Name, E-Mail, Telefon..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contact Cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
            <IconUser size={28} className="text-muted-foreground" stroke={1.5} />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {search ? 'Keine Ergebnisse' : 'Noch keine Einträge'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? 'Andere Suchbegriffe versuchen.' : 'Klicke auf „Neue Eingabe" um loszulegen.'}
            </p>
          </div>
          {!search && (
            <Button onClick={() => { setEditRecord(null); setDialogOpen(true); }}>
              <IconPlus size={16} className="mr-2" />Erste Eingabe erstellen
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(record => (
            <ContactCard
              key={record.record_id}
              record={record}
              onEdit={() => { setEditRecord(record); setDialogOpen(true); }}
              onDelete={() => setDeleteTarget(record)}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <TesteingabeDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditRecord(null); }}
        onSubmit={async (fields) => {
          if (editRecord) {
            await LivingAppsService.updateTesteingabeEntry(editRecord.record_id, fields);
          } else {
            await LivingAppsService.createTesteingabeEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editRecord?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Testeingabe']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Testeingabe']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eintrag löschen"
        description={`Soll der Eintrag von ${deleteTarget?.fields.vorname ?? ''} ${deleteTarget?.fields.nachname ?? ''} wirklich gelöscht werden?`}
        onConfirm={async () => {
          if (deleteTarget) {
            await LivingAppsService.deleteTesteingabeEntry(deleteTarget.record_id);
            fetchAll();
            setDeleteTarget(null);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function ContactCard({
  record,
  onEdit,
  onDelete,
}: {
  record: Testeingabe;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { vorname, nachname, email, telefon, datum, anmerkungen } = record.fields;
  const fullName = [vorname, nachname].filter(Boolean).join(' ') || '(Kein Name)';
  const initials = [vorname?.[0], nachname?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  return (
    <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Card Header */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">{fullName}</p>
          {datum && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <IconCalendar size={12} className="shrink-0" />
              {formatDate(datum)}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Bearbeiten"
          >
            <IconPencil size={15} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
            title="Löschen"
          >
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="px-5 pb-5 space-y-2 flex-1">
        {email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <IconMail size={14} className="shrink-0 text-muted-foreground/60" />
            <a
              href={`mailto:${email}`}
              className="truncate hover:text-primary transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {email}
            </a>
          </div>
        )}
        {telefon && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
            <IconPhone size={14} className="shrink-0 text-muted-foreground/60" />
            <a
              href={`tel:${telefon}`}
              className="truncate hover:text-primary transition-colors"
              onClick={e => e.stopPropagation()}
            >
              {telefon}
            </a>
          </div>
        )}
        {anmerkungen && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground min-w-0">
            <IconFileText size={14} className="shrink-0 text-muted-foreground/60 mt-0.5" />
            <p className="line-clamp-2 min-w-0">{anmerkungen}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <Skeleton className="h-10 w-72" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) {
            setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          }
          if (content.startsWith('[DONE]')) {
            setRepairDone(true);
            setRepairing(false);
          }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) {
            setRepairFailed(true);
          }
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
