import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ReactFlow, { Background, Controls, MarkerType, MiniMap, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getCase } from '@/data/cases';
import { nowIso, useApp } from '@/store/AppContext';
import { Badge, EmptyState, Notice, Panel, SectionTitle, btnClass } from '@/components/ui';
import { useDocumentTitle, useMediaQuery } from '@/hooks';
import { LIMITS } from '@/store/reducer';
import type { GraphState, RelationType } from '@/types';

const REL: { id: RelationType; label: string; color: string }[] = [
  { id: 'supports', label: 'Supports', color: '#4ade80' },
  { id: 'contradicts', label: 'Contradicts', color: '#fbbf24' },
  { id: 'precedes', label: 'Precedes', color: '#22d3ee' },
  { id: 'related', label: 'Related', color: '#a78bfa' },
];
const colorOf = (t: RelationType): string => REL.find((r) => r.id === t)?.color ?? '#94a3b8';

export default function GraphPage() {
  const { caseId = '' } = useParams();
  const c = getCase(caseId);
  const { state, dispatch } = useApp();
  const wide = useMediaQuery('(min-width: 768px)');
  const inv = c ? state.investigations[c.id] : undefined;
  const [relType, setRelType] = useState<RelationType>('supports');
  const [label, setLabel] = useState('');
  const [src, setSrc] = useState('');
  const [dst, setDst] = useState('');
  const [selEdge, setSelEdge] = useState<string | null>(null);
  useDocumentTitle(c ? `${c.title} — evidence graph` : 'Evidence graph');

  const graph: GraphState = inv?.graph ?? { nodes: [], edges: [] };
  const title = useCallback((id: string) => c?.evidence.find((e) => e.id === id)?.title ?? id, [c]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const nodeKey = graph.nodes.map((n) => `${n.id}:${n.x}:${n.y}`).join('|');
  useEffect(() => {
    setNodes(graph.nodes.map((n) => ({ id: n.id, position: { x: n.x, y: n.y }, data: { label: `${n.id} · ${title(n.id)}` }, style: { background: '#17233b', color: '#e2e8f0', border: '1px solid rgba(34,211,238,0.5)', borderRadius: 10, fontSize: 12, width: 190, padding: 8 } })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey, title]);

  const edges = useMemo(() => graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label ? `${e.type}: ${e.label}` : e.type, animated: e.type === 'precedes', style: { stroke: colorOf(e.type), strokeWidth: selEdge === e.id ? 3 : 1.6 }, markerEnd: { type: MarkerType.ArrowClosed, color: colorOf(e.type) }, labelStyle: { fill: '#e2e8f0', fontSize: 11 }, labelBgStyle: { fill: '#101a2e' } })), [graph.edges, selEdge]);

  if (!c) return <div className="container-app py-12"><EmptyState title="Case not found" /></div>;
  if (!inv) return <Navigate to={`/cases/${c.id}`} replace />;
  const readOnly = inv.status !== 'active';
  const save = (g: GraphState) => dispatch({ type: 'GRAPH_SET', caseId: c.id, graph: g, now: nowIso() });
  const inGraph = new Set(graph.nodes.map((n) => n.id));
  const available = inv.collected.filter((id) => !inGraph.has(id));

  const addNode = (id: string) => save({ ...graph, nodes: [...graph.nodes, { id, x: 40 + (graph.nodes.length % 4) * 230, y: 40 + Math.floor(graph.nodes.length / 4) * 120 }] });
  const removeNode = (id: string) => save({ nodes: graph.nodes.filter((n) => n.id !== id), edges: graph.edges.filter((e) => e.source !== id && e.target !== id) });
  const addEdge = (source: string, target: string) => {
    if (!source || !target || source === target) return;
    save({ ...graph, edges: [...graph.edges, { id: `e-${Date.now().toString(36)}-${graph.edges.length}`, source, target, type: relType, label: label.trim().slice(0, LIMITS.edgeLabel) }] });
    setLabel('');
  };
  const removeEdge = (id: string) => { save({ ...graph, edges: graph.edges.filter((e) => e.id !== id) }); setSelEdge(null); };
  const onDragStop = () => save({ ...graph, nodes: nodes.map((n: { id: string; position: { x: number; y: number } }) => ({ id: n.id, x: n.position.x, y: n.position.y })) });

  const list = (
    <Panel className="p-5" aria-label="Graph list editor">
      <SectionTitle title={wide ? 'Connections' : 'Evidence graph'} subtitle="Link evidence items. This list works with keyboard and screen readers." />
      {readOnly && <Notice>This investigation is completed; the graph is read-only.</Notice>}
      {!readOnly && (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); addEdge(src, dst); }}>
          <div><label className="label" htmlFor="g-src">From</label><select id="g-src" className="field" value={src} onChange={(e) => setSrc(e.target.value)}><option value="">Choose…</option>{graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.id} — {title(n.id)}</option>)}</select></div>
          <div><label className="label" htmlFor="g-dst">To</label><select id="g-dst" className="field" value={dst} onChange={(e) => setDst(e.target.value)}><option value="">Choose…</option>{graph.nodes.filter((n) => n.id !== src).map((n) => <option key={n.id} value={n.id}>{n.id} — {title(n.id)}</option>)}</select></div>
          <div><label className="label" htmlFor="g-rel">Relationship</label><select id="g-rel" className="field" value={relType} onChange={(e) => setRelType(e.target.value as RelationType)}>{REL.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
          <div><label className="label" htmlFor="g-lab">Label (optional)</label><input id="g-lab" className="field" maxLength={LIMITS.edgeLabel} value={label} onChange={(e) => setLabel(e.target.value)} /></div>
          <div className="sm:col-span-2"><button type="submit" className="btn btn-primary btn-sm" disabled={!src || !dst || src === dst}><Plus className="h-4 w-4" aria-hidden="true" />Add connection</button></div>
        </form>
      )}
      {graph.edges.length === 0 ? <div className="mt-4"><EmptyState title="No connections yet" body="Connect two items and say how they relate." /></div> : (
        <ul className="mt-4 space-y-2">{graph.edges.map((e) => (
          <li key={e.id} className="panel-quiet flex items-center justify-between gap-2 p-2 text-sm">
            <span><span className="mono text-xs">{e.source}</span> <Badge tone={e.type === 'supports' ? 'ok' : e.type === 'contradicts' ? 'warn' : 'cyan'}>{e.type}</Badge> <span className="mono text-xs">{e.target}</span>{e.label && <span className="ml-2 text-slate-400">{e.label}</span>}</span>
            {!readOnly && <button type="button" className="text-slate-400 hover:text-alert-400" aria-label={`Remove connection ${e.source} to ${e.target}`} onClick={() => removeEdge(e.id)}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
          </li>))}</ul>
      )}
    </Panel>
  );

  return (
    <div className="container-app py-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><Link to={inv.status === 'active' ? `/case/${c.id}` : `/case/${c.id}/report`} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Back</Link><h1 className="text-xl">{c.title}: evidence graph</h1></div>
        <div className="flex flex-wrap gap-2" aria-label="Legend">{REL.map((r) => <span key={r.id} className="badge border-white/15 text-slate-300"><span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden="true" />{r.label}</span>)}</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        <aside className="lg:col-span-1">
          <Panel className="p-4" aria-label="Collected evidence">
            <h2 className="text-sm">Collected evidence not in graph</h2>
            {available.length === 0 ? <p className="mt-2 text-xs text-slate-500">{inv.collected.length === 0 ? 'Collect evidence in the workspace first.' : 'All collected items are in the graph.'}</p> : (
              <ul className="mt-2 space-y-2">{available.map((id) => <li key={id} className="flex items-center justify-between gap-2 text-sm"><span className="min-w-0 truncate"><span className="mono text-xs text-slate-500">{id}</span> {title(id)}</span>{!readOnly && <button type="button" className="btn btn-secondary btn-sm" onClick={() => addNode(id)} aria-label={`Add ${title(id)} to graph`}><Plus className="h-4 w-4" aria-hidden="true" /></button>}</li>)}</ul>
            )}
            {!readOnly && graph.nodes.length > 0 && (
              <div className="mt-4 border-t border-white/10 pt-3"><label className="label" htmlFor="rm-node">Remove from graph</label><select id="rm-node" className="field" value="" onChange={(e) => e.target.value && removeNode(e.target.value)}><option value="">Choose…</option>{graph.nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}</select></div>
            )}
          </Panel>
        </aside>
        <div className="space-y-4 lg:col-span-3">
          {wide && (
            <div className="panel h-[28rem] overflow-hidden" role="application" aria-label="Evidence graph canvas. A list-based editor is available below.">
              <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onNodeDragStop={onDragStop} onEdgeClick={(_: unknown, e: { id: string }) => setSelEdge(e.id)} onConnect={(p: { source: string | null; target: string | null }) => !readOnly && p.source && p.target && addEdge(p.source, p.target)} nodesConnectable={!readOnly} nodesDraggable={!readOnly} fitView proOptions={{ hideAttribution: true }}>
                <Background color="rgba(255,255,255,0.08)" gap={20} />
                <Controls showInteractive={false} />
                <MiniMap pannable zoomable nodeColor="#22d3ee" maskColor="rgba(7,11,20,0.7)" />
              </ReactFlow>
            </div>
          )}
          {wide && !readOnly && <p className="text-xs text-slate-500">Drag from one node's handle to another to connect them using the relationship chosen below. Click a connection to select it, or use the list.</p>}
          {wide && selEdge && !readOnly && <button type="button" className={btnClass('danger', 'sm')} onClick={() => removeEdge(selEdge)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete selected connection</button>}
          {list}
        </div>
      </div>
    </div>
  );
}
