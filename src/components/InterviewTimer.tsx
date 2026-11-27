import { useEffect, useState } from 'react';

const DURATION_SECONDS = 120; // 02:00 per soal

const QUESTIONS: string[] = [
  'Perkenalkan dirimu dan ceritakan proyek IT yang paling kamu banggakan.',
  'Ceritakan bug tersulit saat mengelola state di proyek React yang pernah kamu buat, dan bagaimana kamu memperbaikinya?',
  'Apa perbedaan let, const, dan var di JavaScript? Kapan kamu memakai masing-masing?',
  'Jelaskan alur request dari browser sampai data tampil di layar saat memanggil REST API.',
  'Bagaimana cara kamu bekerja dalam tim memakai Git (branch, pull request, resolve conflict)?',
];

const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

export default function InterviewTimer() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
  const [isRunning, setIsRunning] = useState(false);

  const isFinished = secondsLeft === 0;
  const isTicking = isRunning && !isFinished; // derived: berhenti otomatis di 00:00

  useEffect(() => {
    if (!isTicking) return;

    const intervalId = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // WAJIB cleanup: saat pause, ganti soal, atau panel ditutup (unmount)
    // interval lama dibersihkan sehingga detik tidak jalan 2x lebih cepat
    return () => clearInterval(intervalId);
  }, [isTicking]);

  const handleReset = () => {
    setIsRunning(false);
    setSecondsLeft(DURATION_SECONDS);
  };

  const handleNext = () => {
    setQuestionIndex((prev) => (prev + 1) % QUESTIONS.length);
    handleReset(); // otomatis kembali ke 02:00
  };

  return (
    <section className="timer-card">
      <div className="timer-head">
        <span className="section-title">Latihan Interview</span>
        <span className="timer-counter">
          Soal {questionIndex + 1} / {QUESTIONS.length}
        </span>
      </div>

      <p className="timer-question">"{QUESTIONS[questionIndex]}"</p>

      <div className="timer-body">
        <span className={`timer-clock ${isFinished ? 'is-finished' : ''}`}>
          {formatTime(secondsLeft)}
        </span>
        <div className="timer-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsRunning((prev) => !prev)}
            disabled={isFinished}
          >
            {isTicking ? 'Jeda' : 'Mulai'}
          </button>
          <button type="button" className="btn" onClick={handleReset}>Reset</button>
          <button type="button" className="btn" onClick={handleNext}>Lanjut</button>
        </div>
      </div>
      {isFinished && <p className="timer-done">Waktu habis! Klik Reset atau lanjut ke soal berikutnya.</p>}
    </section>
  );
}