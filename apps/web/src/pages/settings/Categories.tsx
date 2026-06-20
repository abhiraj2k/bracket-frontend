import { useState } from 'react';
import { useEscKey } from '../../lib/useEscKey';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { categoriesApi } from '@et/api';
import type { CategoryResponse } from '@et/api';
import { keys } from '../../lib/queryClient';

interface CreateState {
  show: boolean;
  initialParent: CategoryResponse | null;
}

export default function CategoriesSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [alias, setAlias] = useState('');
  const [createState, setCreateState] = useState<CreateState>({ show: false, initialParent: null });

  const { data: categories = [] } = useQuery({ queryKey: keys.categories, queryFn: categoriesApi.list });

  const aliasMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string | null }) =>
      categoriesApi.updateAlias(id, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.categories });
      setEditing(null);
    },
  });

  const childrenOf = (id: string) => categories.filter((c) => c.parentCategoryId === id);
  const roots = categories.filter((c) => !c.parentCategoryId);
  const expenseRoots = roots.filter((r) => r.categoryType === 'EXPENSE');
  const incomeRoots = roots.filter((r) => r.categoryType === 'INCOME');

  const openEdit = (c: CategoryResponse) => { setEditing(c); setAlias(c.customAlias ?? c.name); };
  const openAddSub = (parent: CategoryResponse) => setCreateState({ show: true, initialParent: parent });

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/settings')} className="text-gray-400">‹</button>
        <h1 className="text-xl font-bold flex-1">Categories</h1>
        <button
          onClick={() => setCreateState({ show: true, initialParent: null })}
          className="text-brand font-semibold text-sm"
        >
          + New
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-5">Rename any category, or create your own.</p>

      <Section title="Expense" roots={expenseRoots} childrenOf={childrenOf} onEdit={openEdit} onAddSub={openAddSub} />
      <Section title="Income" roots={incomeRoots} childrenOf={childrenOf} onEdit={openEdit} onAddSub={openAddSub} />

      {/* Rename sheet */}
      {editing && (
        <RenameSheet
          category={editing}
          alias={alias}
          onAliasChange={setAlias}
          isPending={aliasMutation.isPending}
          onClear={() => aliasMutation.mutate({ id: editing.id, value: null })}
          onSave={() => aliasMutation.mutate({ id: editing.id, value: alias })}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Create sheet */}
      {createState.show && (
        <CreateCategorySheet
          categories={categories}
          initialParent={createState.initialParent}
          onClose={() => setCreateState({ show: false, initialParent: null })}
          onCreated={() => {
            qc.invalidateQueries({ queryKey: keys.categories });
            setCreateState({ show: false, initialParent: null });
          }}
        />
      )}
    </div>
  );
}

function Section({ title, roots, childrenOf, onEdit, onAddSub }: {
  title: string;
  roots: CategoryResponse[];
  childrenOf: (id: string) => CategoryResponse[];
  onEdit: (c: CategoryResponse) => void;
  onAddSub: (parent: CategoryResponse) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <div className="mb-5">
      <p className="section-title">{title}</p>
      {roots.length === 0 && (
        <p className="text-gray-600 text-sm px-1 mb-3">No {title.toLowerCase()} categories yet.</p>
      )}
      <div className="card space-y-0 divide-y divide-border">
        {roots.map((root) => (
          <CategoryNode
            key={root.id}
            cat={root}
            depth={0}
            childrenOf={childrenOf}
            expanded={expanded}
            toggle={toggle}
            onEdit={onEdit}
            onAddSub={onAddSub}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryNode({ cat, depth, childrenOf, expanded, toggle, onEdit, onAddSub }: {
  cat: CategoryResponse;
  depth: number;
  childrenOf: (id: string) => CategoryResponse[];
  expanded: Set<string>;
  toggle: (id: string) => void;
  onEdit: (c: CategoryResponse) => void;
  onAddSub: (parent: CategoryResponse) => void;
}) {
  const kids = childrenOf(cat.id);
  const isExpanded = expanded.has(cat.id);
  const isPersonal = !cat.isGlobal;

  return (
    <>
      <div
        className="flex items-center justify-between py-3"
        style={{ paddingLeft: `${4 + depth * 16}px`, paddingRight: '4px' }}
      >
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {depth > 0 && <span className="text-gray-600 text-xs flex-shrink-0">└─</span>}
          <span className={`text-sm truncate ${depth === 0 ? 'text-white' : 'text-gray-400'}`}>
            {cat.customAlias ?? cat.name}
          </span>
          {cat.customAlias && (
            <span className="text-gray-600 text-xs flex-shrink-0">({cat.name})</span>
          )}
          {isPersonal && <span className="badge-ok text-[10px] flex-shrink-0">CUSTOM</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => onAddSub(cat)} className="text-gray-500 text-xs">+ Sub</button>
          <button onClick={() => onEdit(cat)} className="text-brand text-xs">Rename</button>
          {kids.length > 0 && (
            <button onClick={() => toggle(cat.id)} className="text-gray-500 text-xs p-1">
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>
      {isExpanded && kids.map((kid) => (
        <CategoryNode
          key={kid.id}
          cat={kid}
          depth={depth + 1}
          childrenOf={childrenOf}
          expanded={expanded}
          toggle={toggle}
          onEdit={onEdit}
          onAddSub={onAddSub}
        />
      ))}
    </>
  );
}

function RenameSheet({ category, alias, onAliasChange, isPending, onClear, onSave, onClose }: {
  category: CategoryResponse;
  alias: string;
  onAliasChange: (v: string) => void;
  isPending: boolean;
  onClear: () => void;
  onSave: () => void;
  onClose: () => void;
}) {
  useEscKey(onClose);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold">Rename Category</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
        </div>
        <p className="text-gray-500 text-sm">System name: <span className="text-gray-300">{category.name}</span></p>
        <input
          value={alias}
          onChange={(e) => onAliasChange(e.target.value)}
          placeholder={category.name}
          className="input"
          autoFocus
        />
        <div className="flex gap-3">
          <button onClick={onClear} disabled={isPending} className="flex-1 py-3 rounded-xl border border-border text-gray-400 text-sm">
            Clear alias
          </button>
          <button onClick={onSave} disabled={!alias || isPending} className="flex-1 btn-primary">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FlatOption { id: string; label: string; depth: number; }

function buildFlatOptions(
  categories: CategoryResponse[],
  parentId: string | null,
  type: 'EXPENSE' | 'INCOME',
  depth: number,
): FlatOption[] {
  return categories
    .filter((c) =>
      (parentId === null ? !c.parentCategoryId : c.parentCategoryId === parentId) &&
      c.categoryType === type,
    )
    .flatMap((c) => [
      { id: c.id, label: c.customAlias ?? c.name, depth },
      ...buildFlatOptions(categories, c.id, type, depth + 1),
    ]);
}

function CreateCategorySheet({ categories, initialParent, onClose, onCreated }: {
  categories: CategoryResponse[];
  initialParent: CategoryResponse | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  useEscKey(onClose);
  const [name, setName] = useState('');
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>(
    initialParent?.categoryType ?? 'EXPENSE',
  );
  const [parentId, setParentId] = useState(initialParent?.id ?? '');
  const typeLocked = initialParent != null;

  const flatOptions = buildFlatOptions(categories, null, type, 0);

  const mutation = useMutation({
    mutationFn: () =>
      categoriesApi.create({
        name,
        categoryType: type,
        ...(parentId ? { parentCategoryId: parentId } : {}),
      }),
    onSuccess: onCreated,
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface-raised rounded-t-3xl flex flex-col max-h-[85vh]">

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-lg">
              {initialParent
                ? `Add under "${initialParent.customAlias ?? initialParent.name}"`
                : 'New Category'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">✕</button>
          </div>

          {/* Type toggle — locked when adding a sub */}
          <div>
            <label className="section-title block">Type</label>
            <div className="flex gap-2">
              {(['EXPENSE', 'INCOME'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { if (!typeLocked) { setType(t); setParentId(''); } }}
                  disabled={typeLocked}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                    type === t
                      ? t === 'EXPENSE' ? 'bg-expense text-white' : 'bg-income text-black'
                      : 'bg-surface text-gray-400'
                  }`}
                >
                  {t === 'EXPENSE' ? '💸 Expense' : '💰 Income'}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="section-title block">Category Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Subscriptions"
              className="input"
              autoFocus
            />
          </div>

          {/* Parent — shows full hierarchy, disabled when pre-set */}
          <div>
            <label className="section-title block">
              Parent Category{' '}
              <span className="normal-case font-normal text-gray-500">(optional)</span>
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={typeLocked}
              className="input disabled:opacity-60"
            >
              <option value="">None (root category)</option>
              {flatOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {'  '.repeat(opt.depth)}{opt.depth > 0 ? '└─ ' : ''}{opt.label}
                </option>
              ))}
            </select>
          </div>

          {mutation.isError && (
            <p className="text-expense text-sm">Failed to create category.</p>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-surface-raised">
          <button
            onClick={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
            className="btn-primary disabled:opacity-60"
          >
            {mutation.isPending ? 'Creating…' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  );
}
