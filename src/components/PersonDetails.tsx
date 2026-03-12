'use client';
import Image from 'next/image';
import { Person, Relationship } from '@/types';

const REL_LABEL: Record<string, string> = {
  PARENT_CHILD: 'Parent / Child',
  SPOUSE: 'Spouse',
  SIBLING: 'Sibling',
};

const REL_COLOR: Record<string, string> = {
  PARENT_CHILD: '#6b7280',
  SPOUSE: '#f59e0b',
  SIBLING: '#60a5fa',
};

interface Props {
  person: Person;
  persons: Person[];
  relationships: Relationship[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDeleteRelationship: (id: string) => void;
}

export default function PersonDetails({
  person, persons, relationships, onClose, onEdit, onDelete, onDeleteRelationship,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-white rounded-t-3xl">
          <h2 className="text-lg font-semibold">Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* Photo */}
          <div className="bg-gray-100 rounded-2xl flex items-center justify-center h-52 mb-5 overflow-hidden">
            {person.photo_url ? (
              <Image src={person.photo_url} alt={person.name} width={300} height={208} className="object-cover w-full h-full" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-24 h-24 text-gray-300" fill="currentColor">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
          </div>

          {/* Name */}
          <div className="text-center mb-5">
            {person.honorific && <p className="text-sm text-gray-500">{person.honorific}</p>}
            <h1 className="text-3xl font-bold text-gray-900">{person.name}</h1>
            {person.nickname && <p className="text-sm text-gray-400 mt-0.5">"{person.nickname}"</p>}
          </div>

          {/* Info */}
          {(person.gender || person.birth_date || person.additional_information) && (
            <div className="mb-5 space-y-1.5 text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3">
              {person.gender && <p><span className="font-medium">Gender:</span> {person.gender === 'MALE' ? 'Male' : 'Female'}</p>}
              {person.birth_date && <p><span className="font-medium">Born:</span> {new Date(person.birth_date).toLocaleDateString()}</p>}
              {person.is_dead && person.death_date && <p><span className="font-medium">Died:</span> {new Date(person.death_date).toLocaleDateString()}</p>}
              {person.additional_information && <p className="pt-1 text-gray-500 italic">{person.additional_information}</p>}
            </div>
          )}

          {/* Relationships */}
          {relationships.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Connections</p>
              <div className="space-y-2">
                {relationships.map((r) => {
                  const otherId = r.person1_id === person.id ? r.person2_id : r.person1_id;
                  const other = persons.find((p) => p.id === otherId);
                  const isParent = r.relationship_type === 'PARENT_CHILD' && r.person1_id === person.id;
                  const isChild  = r.relationship_type === 'PARENT_CHILD' && r.person2_id === person.id;
                  const label =
                    isParent ? 'Parent of' :
                    isChild  ? 'Child of'  :
                    REL_LABEL[r.relationship_type];

                  return (
                    <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: REL_COLOR[r.relationship_type] }} />
                        <span className="text-xs text-gray-400">{label}</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {other ? `${other.honorific ? other.honorific + ' ' : ''}${other.name}` : 'Unknown'}
                        </span>
                      </div>
                      <button
                        onClick={() => onDeleteRelationship(r.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button onClick={onEdit} className="w-full py-3 border-2 border-gray-900 rounded-full font-semibold text-gray-900 hover:bg-gray-50 transition-colors">
              Edit
            </button>
            <button onClick={onDelete} className="w-full py-3 border border-gray-300 rounded-full font-semibold text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-300 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
