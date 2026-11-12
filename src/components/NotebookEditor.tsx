import { useId, useMemo, useState, type FormEvent } from 'react';
import { catalog } from '../core/catalog';
import { HELD } from '../core/heldPlaces';
import { NOTEBOOK_LIMITS, type NotebookEntry, type NotebookEntryInput } from '../core/notebook';

export type NotebookEditorInput = NotebookEntryInput;

export interface NotebookEditorProps {
  entry?: NotebookEntry;
  initialNodeId: string;
  initialKind?: 'idea' | 'question';
  initialTitle?: string;
  onSave: (input: NotebookEditorInput) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const evidenceOptions: { value: NotebookEntry['evidence']; title: string; detail: string }[] = [
  { value: 'encountered', title: 'Encountered it', detail: 'Something I want to keep.' },
  { value: 'explained', title: 'Explained it', detail: 'I put it in my own words.' },
  { value: 'applied', title: 'Used it', detail: 'I tried it out in practice.' },
];

/** Form body only. The parent supplies the accessible dialog and focus management. */
export function NotebookEditor({ entry, initialNodeId, initialKind = 'idea', initialTitle = '', onSave, onDelete, onClose }: NotebookEditorProps) {
  const [kind, setKind] = useState<NotebookEntry['kind']>(entry?.kind ?? initialKind);
  const [title, setTitle] = useState(entry?.title ?? initialTitle);
  const [body, setBody] = useState(entry?.body ?? '');
  const [sourceUrl, setSourceUrl] = useState(entry?.sourceUrl ?? '');
  const [sourceLabel, setSourceLabel] = useState(entry?.sourceLabel ?? '');
  const [evidence, setEvidence] = useState<NotebookEntry['evidence']>(entry?.evidence ?? 'encountered');
  const [nodeIds, setNodeIds] = useState<string[]>(entry?.nodeIds ?? (catalog.get(initialNodeId) ? [initialNodeId] : []));
  const [topicQuery, setTopicQuery] = useState('');
  const [showTopics, setShowTopics] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const id = useId();
  const topics = useMemo(() => {
    const query = topicQuery.trim().toLocaleLowerCase();
    return catalog.all()
      .filter(node => node.id !== 'knowledge' && !nodeIds.includes(node.id))
      .filter(node => query ? catalog.getPath(node).some(parent => parent.name.toLocaleLowerCase().includes(query)) : node.depth === 1)
      .slice(0, 24);
  }, [topicQuery, nodeIds]);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!title.trim()) { setError(kind === 'question' ? 'Give your question a title.' : 'Give your idea a title.'); return; }
    // An entry whose only places the atlas no longer has can still be edited where it is: it keeps them.
    const keptWhereItWas = !!entry?.[HELD]?.length && !entry.nodeIds.length;
    if (!nodeIds.length && !keptWhereItWas) { setError('Choose at least one place for this entry on the map.'); setShowTopics(true); return; }
    if (sourceUrl.trim()) {
      try {
        const url = new URL(sourceUrl.trim());
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error();
      } catch { setError('Use a complete source link beginning with https:// or http://.'); return; }
    }
    try {
      onSave({
        ...(entry ? { id: entry.id, createdAt: entry.createdAt } : {}),
        title: title.trim(), body: body.trim(), sourceUrl: sourceUrl.trim(), sourceLabel: sourceLabel.trim(),
        kind, evidence: kind === 'question' ? 'encountered' : evidence, nodeIds,
      });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your entry could not be saved. Please try again.');
    }
  }

  function deleteEntry() {
    if (!entry || !onDelete) return;
    try { onDelete(entry.id); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Your entry could not be deleted. Please try again.'); }
  }

  return (
    <form className="capture-editor" onSubmit={save} noValidate>
      <header className="capture-header">
        <p className="capture-kicker">Your personal atlas</p>
        <h2>{entry ? 'Revisit your entry' : kind === 'question' ? 'Keep a question open.' : 'Make an idea your own.'}</h2>
        <p>{kind === 'question' ? 'You don’t need an answer to give a question a place.' : 'A thought worth keeping, connected to where it belongs.'}</p>
      </header>

      <div className="capture-kind-switch" role="group" aria-label="Entry type">
        {(['idea', 'question'] as const).map(value => <button key={value} type="button" className={`capture-kind${kind === value ? ' is-active' : ''}`} aria-pressed={kind === value} data-action="capture-kind" data-kind={value} onClick={() => setKind(value)}>{value === 'idea' ? 'An idea' : 'A question'}</button>)}
      </div>

      <div className="capture-field">
        <label className="capture-label" htmlFor={`${id}-title`}>{kind === 'question' ? 'What are you curious about?' : 'Give this idea a title'}<span>Required</span></label>
        <textarea id={`${id}-title`} className="capture-input capture-title" rows={2} value={title} onChange={event => setTitle(event.target.value)} maxLength={NOTEBOOK_LIMITS.title} required placeholder={kind === 'question' ? 'The question you want to come back to…' : 'The idea, in a sentence…'} data-action="entry-title"/>
      </div>
      <div className="capture-field">
        <label className="capture-label" htmlFor={`${id}-body`}>{kind === 'question' ? 'What made you wonder?' : 'What did you take away?'}<span>Optional</span></label>
        <textarea id={`${id}-body`} className="capture-textarea" rows={5} value={body} onChange={event => setBody(event.target.value)} maxLength={NOTEBOOK_LIMITS.body} placeholder={kind === 'question' ? 'Add context, a hunch, or what you would like to understand.' : 'Explain it in your own words. A rough thought is enough to start.'} data-action="entry-body"/>
      </div>

      <fieldset className="capture-topics">
        <legend className="capture-label">Place it on the map<span>Up to 8 topics</span></legend>
        <p className="capture-hint">An idea can belong in more than one place.</p>
        <div className="capture-topic-selection">
          {nodeIds.map(nodeId => <button key={nodeId} type="button" className="capture-topic-chip" aria-label={`Remove ${catalog.get(nodeId)?.name ?? 'topic'}`} onClick={() => setNodeIds(current => current.filter(value => value !== nodeId))}>{catalog.get(nodeId)?.name ?? nodeId}<span aria-hidden="true">×</span></button>)}
          <button type="button" className="capture-add-topic" aria-expanded={showTopics} aria-controls={`${id}-topics`} disabled={nodeIds.length >= 8 && !showTopics} onClick={() => setShowTopics(current => !current)} data-action="add-entry-topic">{showTopics ? 'Done' : '+ Add a topic'}</button>
        </div>
        {showTopics && <div id={`${id}-topics`} className="capture-topic-picker">
          <label className="capture-topic-search" htmlFor={`${id}-topic-search`}>
            <span>Find a topic</span>
            <input id={`${id}-topic-search`} type="search" value={topicQuery} onChange={event => setTopicQuery(event.target.value)} placeholder="Try music, biology, or design" data-action="entry-topic-search"/>
          </label>
          <div className="capture-topic-results">
            {topics.length ? topics.map(node => {
              const path = catalog.getPath(node).slice(1, -1).map(parent => parent.name).join(' / ');
              return <button key={node.id} type="button" className="capture-topic-option" disabled={nodeIds.length >= 8} data-action="select-entry-topic" data-node-id={node.id} onClick={() => { setNodeIds(current => current.length < 8 && !current.includes(node.id) ? [...current, node.id] : current); setTopicQuery(''); }}><span><strong>{node.name}</strong>{path && <small>{path}</small>}</span><span aria-hidden="true">+</span></button>;
            }) : <p className="capture-hint">No matching topics. Try a broader subject.</p>}
          </div>
          {nodeIds.length >= 8 && <p className="capture-hint">Eight topics selected. Remove one to choose another.</p>}
        </div>}
      </fieldset>

      <details className="capture-source" open={Boolean(entry?.sourceUrl || entry?.sourceLabel)}>
        <summary>Add a source<span>Optional</span></summary>
        <div className="capture-source-fields">
          <div className="capture-field"><label className="capture-label" htmlFor={`${id}-source-label`}>Source name</label><input id={`${id}-source-label`} className="capture-input" value={sourceLabel} onChange={event => setSourceLabel(event.target.value)} maxLength={NOTEBOOK_LIMITS.sourceLabel} placeholder="Book, video, conversation…" data-action="entry-source-label"/></div>
          <div className="capture-field"><label className="capture-label" htmlFor={`${id}-source-url`}>Link</label><input id={`${id}-source-url`} className="capture-input" type="url" value={sourceUrl} onChange={event => setSourceUrl(event.target.value)} maxLength={NOTEBOOK_LIMITS.sourceUrl} placeholder="https://" data-action="entry-source-url"/></div>
        </div>
        <p className="capture-hint">Keep a reference to revisit. Source content isn’t imported.</p>
      </details>

      {kind === 'idea' && <fieldset className="capture-evidence">
        <legend className="capture-label">How have you worked with it?</legend>
        <div className="capture-evidence-options">
          {evidenceOptions.map(option => <label key={option.value} className={`capture-evidence-option${evidence === option.value ? ' is-active' : ''}`}><input type="radio" name={`${id}-evidence`} value={option.value} checked={evidence === option.value} onChange={() => setEvidence(option.value)} data-action="entry-evidence"/><span><strong>{option.title}</strong><small>{option.detail}</small></span></label>)}
        </div>
        <p className="capture-hint">Your experience, in your own judgment. This isn’t a verified measure of mastery.</p>
      </fieldset>}

      {error && <p className="capture-notice" role="alert">{error}</p>}
      <footer className="capture-footer">
        <div className="capture-delete-area">
          {entry && onDelete && (confirmDelete ? <div className="capture-delete-confirm"><span>Delete this {entry.kind === 'question' ? 'question' : 'note'}?</span><button type="button" className="capture-danger" onClick={deleteEntry} data-action="delete-entry">Delete</button><button type="button" className="capture-secondary" onClick={() => setConfirmDelete(false)}>Keep it</button></div> : <button type="button" className="capture-delete" onClick={() => setConfirmDelete(true)} data-action="confirm-delete-entry">Delete entry</button>)}
        </div>
        <div className="capture-save-actions"><button type="button" className="capture-secondary" onClick={onClose}>Cancel</button><button type="submit" className="capture-primary" data-action="save-entry">{entry ? 'Save changes' : kind === 'question' ? 'Keep question' : 'Save idea'}<span aria-hidden="true">↗</span></button></div>
      </footer>
    </form>
  );
}
