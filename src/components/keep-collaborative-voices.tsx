import { Check, Link2, Plus, Smartphone, Trash2 } from "lucide-react";
import { useId } from "react";
import type { KeepContributor, KeepProject } from "@/lib/keep-project";

type RecordingLocation = NonNullable<KeepProject["voiceRecordingLocation"]>;

const recordingChoices = [
  {
    value: "in_person",
    title: "Together here",
    description: "Take turns sharing memories and recording on one device.",
    Icon: Smartphone,
  },
  {
    value: "remote",
    title: "From anywhere",
    description: "Each person shares their own memories using a private link.",
    Icon: Link2,
  },
] as const;

/** The same collaborative setup, presented as a compact pair of editorial sections. */
export function KeepCollaborativeVoices({
  contributors,
  location,
  onRename,
  onRelationship,
  onAdd,
  onRemove,
  onLocationChange,
}: {
  contributors: KeepContributor[];
  location?: RecordingLocation | undefined;
  onRename: (id: string, name: string) => void;
  onRelationship?: (id: string, relationship: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onLocationChange: (location: RecordingLocation) => void;
}) {
  const id = useId();
  return (
    <section className="keep-collaborative-voices" aria-labelledby={`${id}-speakers`}>
      <div>
        <h2 id={`${id}-speakers`} className="keep-collaborative-voices__heading">Who is creating with you?</h2>
        <p className="keep-collaborative-voices__intro">
          Add yourself first, then everyone who will contribute.
        </p>
        <div className="keep-collaborative-voices__list">
          {contributors.map((person, i) => (
            <div key={person.id} className="keep-collaborative-voices__person flex-wrap">
              <label className="keep-collaborative-voices__field">
                <span className="keep-collaborative-voices__number" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="keep-collaborative-voices__field-content">
                  <span className="keep-collaborative-voices__label">{i === 0 ? "You · creator" : "Contributor " + (i + 1)}</span>
                  <input
                    aria-label={`Voice ${i + 1} name`}
                    placeholder="Enter their name"
                    maxLength={60}
                    autoComplete="off"
                    value={person.name}
                    onChange={(event) => onRename(person.id, event.target.value)}
                  />
                </span>
              </label>
              {onRelationship && <input aria-label={`${person.name || "Contributor " + (i + 1)} relationship to recipient`} placeholder="Relationship (e.g. daughter)" value={person.relationship ?? ""} maxLength={100} onChange={event => onRelationship(person.id, event.target.value)} className="order-last min-h-11 w-full rounded-lg border border-[#DDD5CB] bg-white px-3 text-base" />}
              {contributors.length > 2 && i > 0 && (
                <button
                  type="button"
                  className="keep-collaborative-voices__remove"
                  aria-label={`Remove ${person.name || `voice ${i + 1}`}`}
                  onClick={() => onRemove(person.id)}
                >
                  <Trash2 size={17} strokeWidth={1.6} aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
        </div>
        {contributors.length < 8 && (
          <button type="button" className="keep-collaborative-voices__add" onClick={onAdd}>
            <span className="keep-collaborative-voices__add-icon" aria-hidden="true">
              <Plus size={16} strokeWidth={1.6} />
            </span>
            Add another contributor
          </button>
        )}
      </div>
      <div className="keep-collaborative-voices__recording">
        <h3 id={`${id}-recording`} className="keep-collaborative-voices__heading">How will you create together?</h3>
        <div className="keep-collaborative-voices__choices" role="group" aria-labelledby={`${id}-recording`}>
          {recordingChoices.map(({ value, title, description, Icon }) => {
            const selected = (location ?? "in_person") === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => onLocationChange(value)}
                className={`keep-recording-choice${selected ? " keep-recording-choice--selected" : ""}`}
              >
                <span className="keep-recording-choice__icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.5} />
                </span>
                <span className="keep-recording-choice__copy">
                  <strong>{title}</strong>
                  <span>{description}</span>
                </span>
                <span className="keep-recording-choice__check" aria-hidden="true">
                  {selected && <Check size={13} strokeWidth={2.4} />}
                </span>
              </button>
            );
          })}
        </div>
        <p className="keep-collaborative-voices__note">
          {location === "remote"
            ? "Everyone contributes independently. You bring the stories together — no need to invite yourself."
            : "Everyone takes a turn sharing their own perspective."}
        </p>
      </div>
    </section>
  );
}
