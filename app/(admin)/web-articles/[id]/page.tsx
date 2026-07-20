"use client";

import React, { useEffect, useState, use } from 'react';
import ArticleForm from '../ArticleForm';
import { Loader2 } from 'lucide-react';

export default function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/web-articles?id=${unwrappedParams.id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [unwrappedParams.id]);

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>;
  if (error || !data) return <div className="p-12 text-center text-rose-500">Artikel tidak ditemukan.</div>;

  return <ArticleForm initialData={data} />;
}
