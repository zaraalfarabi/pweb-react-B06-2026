import { useRef, useState, type FormEvent, type RefObject } from 'react';
import type { Application, WorkMode } from '../types';
import { createActivityLog, isDuplicateApplication, parseSkills } from '../utils/applicationHelpers';

interface ApplicationFormProps {
  applications: Application[];
  onSubmit: (application: Application) => void;
  onCancel: () => void;
}

type InitialStatus = 'WISHLIST' | 'APPLIED';

interface FormValues {
  company: string;
  role: string;
  workMode: WorkMode;
  status: InitialStatus;
  skills: string;
  cvVersion: string;
  appliedDate: string;
}

type ErrorField = 'company' | 'role' | 'skills' | 'cvVersion' | 'appliedDate';
type FormErrors = Partial<Record<ErrorField, string>>;

// urutan input dari atas ke bawah -> menentukan "input pertama yang error"
const FIELD_ORDER: ErrorField[] = ['company', 'role', 'skills', 'cvVersion', 'appliedDate'];

const INITIAL_VALUES: FormValues = {
  company: '',
  role: '',
  workMode: 'Remote',
  status: 'WISHLIST',
  skills: '',
  cvVersion: '',
  appliedDate: '',
};

export default function ApplicationForm({ applications, onSubmit, onCancel }: ApplicationFormProps) {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<FormErrors>({});

  // useRef untuk auto-focus ke input pertama yang error
  const companyRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const skillsRef = useRef<HTMLInputElement>(null);
  const cvVersionRef = useRef<HTMLInputElement>(null);
  const appliedDateRef = useRef<HTMLInputElement>(null);

  const fieldRefs: Record<ErrorField, RefObject<HTMLInputElement | null>> = {
    company: companyRef,
    role: roleRef,
    skills: skillsRef,
    cvVersion: cvVersionRef,
    appliedDate: appliedDateRef,
  };

  // form terkontrol penuh: semua input lewat value + onChange
  const updateField = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (values.company.trim() === '') next.company = 'Nama perusahaan wajib diisi.';
    if (values.role.trim() === '') next.role = 'Posisi / role wajib diisi.';
    if (parseSkills(values.skills).length === 0) next.skills = 'Isi minimal 1 skill (pisahkan dengan koma).';
    if (values.status === 'APPLIED') {
      if (values.cvVersion.trim() === '') next.cvVersion = 'Versi CV wajib diisi untuk status APPLIED.';
      if (values.appliedDate === '') next.appliedDate = 'Tanggal melamar wajib diisi untuk status APPLIED.';
    }
    if (!next.company && !next.role && isDuplicateApplication(applications, values.company, values.role)) {
      next.company = `Lamaran ${values.company.trim()} — ${values.role.trim()} sudah ada (tidak boleh dobel).`;
    }
    return next;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);

    const firstError = FIELD_ORDER.find((field) => nextErrors[field] !== undefined);
    if (firstError) {
      fieldRefs[firstError].current?.focus();
      return;
    }

    const isApplied = values.status === 'APPLIED';
    const now = new Date().toISOString();
    onSubmit({
      id: crypto.randomUUID(),
      company: values.company.trim(),
      role: values.role.trim(),
      workMode: values.workMode,
      status: values.status,
      requiredSkills: parseSkills(values.skills),
      cvVersion: isApplied ? values.cvVersion.trim() : undefined,
      appliedDate: isApplied ? values.appliedDate : undefined,
      lastUpdatedAt: now,
      checklist: [],
      activityLogs: [
        createActivityLog(
          isApplied
            ? `Lamaran dibuat manual & dikirim (CV: ${values.cvVersion.trim()})`
            : 'Lamaran dibuat manual sebagai Wishlist',
        ),
      ],
    });
    setValues(INITIAL_VALUES);
  };

  return (
    <form className="app-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <label className="field">
          <span>Perusahaan</span>
          <input
            ref={companyRef}
            className={`input ${errors.company ? 'has-error' : ''}`}
            value={values.company}
            onChange={(e) => updateField('company', e.target.value)}
            placeholder="cth. Nusantara Cloud"
          />
          {errors.company && <small className="error-text">{errors.company}</small>}
        </label>

        <label className="field">
          <span>Posisi / Role</span>
          <input
            ref={roleRef}
            className={`input ${errors.role ? 'has-error' : ''}`}
            value={values.role}
            onChange={(e) => updateField('role', e.target.value)}
            placeholder="cth. Frontend Intern"
          />
          {errors.role && <small className="error-text">{errors.role}</small>}
        </label>

        <label className="field">
          <span>Mode Kerja</span>
          <select
            className="input"
            value={values.workMode}
            onChange={(e) => updateField('workMode', e.target.value as WorkMode)}
          >
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
            <option value="Onsite">Onsite</option>
          </select>
        </label>

        <label className="field">
          <span>Status Awal</span>
          <select
            className="input"
            value={values.status}
            onChange={(e) => updateField('status', e.target.value as InitialStatus)}
          >
            <option value="WISHLIST">WISHLIST</option>
            <option value="APPLIED">APPLIED</option>
          </select>
        </label>

        <label className="field span-2">
          <span>Required Skills (pisahkan dengan koma)</span>
          <input
            ref={skillsRef}
            className={`input ${errors.skills ? 'has-error' : ''}`}
            value={values.skills}
            onChange={(e) => updateField('skills', e.target.value)}
            placeholder="React, TypeScript, CSS"
          />
          {errors.skills && <small className="error-text">{errors.skills}</small>}
        </label>

        {/* muncul otomatis hanya jika Status Awal = APPLIED */}
        {values.status === 'APPLIED' && (
          <>
            <label className="field">
              <span>Versi CV</span>
              <input
                ref={cvVersionRef}
                className={`input ${errors.cvVersion ? 'has-error' : ''}`}
                value={values.cvVersion}
                onChange={(e) => updateField('cvVersion', e.target.value)}
                placeholder="cth. Kapten-CV-v2.pdf"
              />
              {errors.cvVersion && <small className="error-text">{errors.cvVersion}</small>}
            </label>
            <label className="field">
              <span>Tanggal Melamar</span>
              <input
                ref={appliedDateRef}
                type="date"
                className={`input ${errors.appliedDate ? 'has-error' : ''}`}
                value={values.appliedDate}
                onChange={(e) => updateField('appliedDate', e.target.value)}
              />
              {errors.appliedDate && <small className="error-text">{errors.appliedDate}</small>}
            </label>
          </>
        )}
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>Batal</button>
        <button type="submit" className="btn btn-primary">Simpan Lamaran</button>
      </div>
    </form>
  );
}