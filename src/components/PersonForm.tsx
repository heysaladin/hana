'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Person, PersonFormData, RelationshipType } from '@/types';

interface Props {
  mode: 'create' | 'edit';
  person?: Person;
  persons?: Person[];
  onSubmit: (data: PersonFormData) => Promise<void>;
  onCancel: () => void;
  onRelationship?: (personId: string, type: RelationshipType) => Promise<void>;
}

export default function PersonForm({ mode, person, persons = [], onSubmit, onCancel, onRelationship }: Props) {
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<PersonFormData>();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(person?.photo_url || null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isDead = watch('is_dead');

  useEffect(() => {
    if (person) {
      reset({
        name: person.name,
        nickname: person.nickname || '',
        honorific: person.honorific || '',
        gender: person.gender || '',
        birth_date: person.birth_date ? person.birth_date.split('T')[0] : '',
        is_dead: person.is_dead,
        death_date: person.death_date ? person.death_date.split('T')[0] : '',
        additional_information: person.additional_information || '',
        photo_url: person.photo_url || '',
        order_index: person.order_index ?? 0,
      });
    }
  }, [person, reset]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const submit = async (data: PersonFormData) => {
    let photoUrl = data.photo_url || person?.photo_url || '';
    if (photoFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', photoFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      photoUrl = json.url || '';
      setUploading(false);
    }
    await onSubmit({ ...data, photo_url: photoUrl });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-white rounded-t-3xl">
          <h2 className="text-lg font-semibold">{mode === 'create' ? 'Add Person' : 'Edit Person'}</h2>
          <button onClick={onCancel} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-6 pb-6 space-y-3">
          {/* Photo Upload */}
          <div className="flex flex-col items-center mb-4">
            <div
              onClick={() => fileRef.current?.click()}
              className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors border-2 border-dashed border-gray-300"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="preview" className="object-cover w-full h-full" />
              ) : (
                <svg viewBox="0 0 24 24" className="w-10 h-10 text-gray-400" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <span className="text-xs text-gray-400 mt-2">Tap to upload photo</span>
          </div>

          {/* Fields */}
          {[
            { name: 'name' as const, label: 'Name *', required: true },
            { name: 'nickname' as const, label: 'Nickname' },
            { name: 'honorific' as const, label: 'Honorific (e.g. Kak, Pak, Bu)' },
          ].map(({ name, label, required }) => (
            <input
              key={name}
              {...register(name, { required })}
              placeholder={label}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          ))}

          <select
            {...register('gender')}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-500"
          >
            <option value="">Gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>

          <input
            type="date"
            {...register('birth_date')}
            placeholder="Birth Date"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 cursor-pointer">
            <input type="checkbox" {...register('is_dead')} className="w-4 h-4 accent-gray-900" />
            <span className="text-sm text-gray-600">Deceased</span>
          </label>

          {isDead && (
            <input
              type="date"
              {...register('death_date')}
              placeholder="Death Date"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          )}

          <input
            type="number"
            {...register('order_index', { valueAsNumber: true })}
            placeholder="Order Index (higher = leftmost)"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />

          <textarea
            {...register('additional_information')}
            placeholder="Additional Information"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />

          {/* Relationship (for create mode with existing persons) */}
          {mode === 'create' && persons.length > 0 && onRelationship && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400 mb-2">Connect to existing person (optional)</p>
              <select
                id="rel-person"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none mb-2"
                defaultValue=""
              >
                <option value="">Select person...</option>
                {persons.map((p) => (
                  <option key={p.id} value={p.id}>{p.honorific ? `${p.honorific} ` : ''}{p.name}</option>
                ))}
              </select>
              <select
                id="rel-type"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none"
                defaultValue="PARENT_CHILD"
              >
                <option value="PARENT_CHILD">Parent &rarr; Child</option>
                <option value="SPOUSE">Spouse</option>
                <option value="SIBLING">Sibling</option>
              </select>
            </div>
          )}

          {/* Submit */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || uploading}
              className="w-full py-3 border-2 border-gray-900 rounded-full font-semibold text-gray-900 hover:bg-gray-900 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || uploading ? 'Saving...' : mode === 'create' ? 'Add' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 border border-gray-200 rounded-full font-semibold text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
