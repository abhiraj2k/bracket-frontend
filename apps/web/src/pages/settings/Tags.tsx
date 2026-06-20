import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { tagsApi } from '@et/api';
import { keys } from '../../lib/queryClient';

export default function TagsSettings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const { data: tags = [] } = useQuery({ queryKey: keys.tags, queryFn: tagsApi.list });

  const mutation = useMutation({
    mutationFn: (name: string) => tagsApi.create(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: keys.tags }); setNewTag(''); },
  });

  const global = tags.filter((t) => t.isGlobal);
  const mine = tags.filter((t) => !t.isGlobal);

  return (
    <div className="px-4 pt-6 pb-24">
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/settings')} className="text-gray-400">‹</button>
        <h1 className="text-xl font-bold">Tags</h1>
      </div>

      <p className="section-title">Global Tags</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {global.map((t) => (
          <span key={t.id} className="px-3 py-1.5 rounded-full bg-surface border border-border text-gray-300 text-sm">{t.name}</span>
        ))}
      </div>

      <p className="section-title">My Tags</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {mine.map((t) => (
          <span key={t.id} className="px-3 py-1.5 rounded-full bg-brand/20 text-brand text-sm">{t.name}</span>
        ))}
        {mine.length === 0 && <p className="text-gray-500 text-sm">No custom tags yet.</p>}
      </div>

      <div className="flex gap-2 mt-4">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && newTag && mutation.mutate(newTag)}
          placeholder="New tag name"
          className="input flex-1"
        />
        <button
          onClick={() => newTag && mutation.mutate(newTag)}
          disabled={!newTag || mutation.isPending}
          className="px-5 py-3 bg-brand rounded-xl text-white font-semibold disabled:opacity-60"
        >
          Add
        </button>
      </div>
    </div>
  );
}
