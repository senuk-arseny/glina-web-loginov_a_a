import { useNavigate } from "react-router-dom";
import { programs, masters } from "../mock/data";
import { ThrowingRings } from "../components/ThrowingRings";

// Плейсхолдер-файлы лежат в public/images/ и уже закоммичены в проект — страница
// работает "из коробки". Чтобы поставить реальное фото, ЗАМЕНИ СОДЕРЖИМОЕ файла
// по тому же пути тем же именем (или поменяй путь в PROGRAM_PHOTOS/MASTER_PHOTOS
// ниже, если используешь другое имя файла/формат).

const HERO_PHOTO = "/images/hero-hands-on-wheel.jpg"; // руки на гончарном круге в движении, мокрая глина, тёплый свет
const CTA_PHOTO = "/images/cta-shelf.jpg"; // полка с готовыми обожжёнными и глазурованными изделиями

// По одному фото на программу — ключ это Program.id из src/mock/data.ts
const PROGRAM_PHOTOS: Record<string, { src: string; hint: string }> = {
  "prog-beginner": {
    src: "/images/program-beginner.jpg",
    hint: "лепка руками без круга, простая посуда на столе",
  },
  "prog-wheel": {
    src: "/images/program-wheel.jpg",
    hint: "сосуд формируется на круге, видно вращение/капли воды",
  },
};

// По одному фото на каждого из 4 мастеров — ключ это Master.id из src/mock/data.ts.
// Это отдельные файлы для КАЖДОГО мастера, а не один общий плейсхолдер на всех.
const MASTER_PHOTOS: Record<string, string> = {
  "master-1": "/images/masters/master-anna.jpg", // Анна Круглова
  "master-2": "/images/masters/master-igor.jpg", // Игорь Смирнов
  "master-3": "/images/masters/master-dasha.jpg", // Даша Липина
  "master-4": "/images/masters/master-pavel.jpg", // Павел Гончаров
};

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home">
      <header className="home-nav">
        <span className="home-nav__logo">Гончарная мастерская</span>
        <button className="home-nav__cta" onClick={() => navigate("/login")}>
          Войти →
        </button>
      </header>

      <section className="home-hero">
        <div className="home-hero__text">
          <h1>
            Глина ждёт <em>ваших рук</em>
          </h1>
          <p>
            Мастер-классы по лепке и гончарному кругу в центре города.
            Выберите время — глину, круг и фартук приготовим сами.
          </p>
          <button onClick={() => navigate("/login")}>Войти в мастерскую</button>
        </div>
        <div className="home-hero__visual">
          <ThrowingRings />
          <img
            src={HERO_PHOTO}
            alt="Руки на гончарном круге"
            className="home-hero__photo"
          />
        </div>
      </section>

      <section className="home-section">
        <h2>Как это работает</h2>
        <div className="home-steps">
          <div className="home-step">
            <span className="home-step__num">01</span>
            <h3>Выбрать программу</h3>
            <p>Лепка для новичков или гончарный круг — смотрите расписание на неделю вперёд.</p>
          </div>
          <div className="home-step">
            <span className="home-step__num">02</span>
            <h3>Записаться</h3>
            <p>Свободные места видно сразу. Нет мест — вставайте в лист ожидания.</p>
          </div>
          <div className="home-step">
            <span className="home-step__num">03</span>
            <h3>Прийти и лепить</h3>
            <p>Всё остальное — глина, круг, инструменты по желанию — уже готово.</p>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h2>Программы</h2>
        <div className="home-programs">
          {programs.map((program) => {
            const photo = PROGRAM_PHOTOS[program.id];
            return (
              <div className="program-card" key={program.id}>
                {photo && (
                  <img
                    src={photo.src}
                    alt={program.name}
                    title={photo.hint}
                    className="program-card__photo"
                  />
                )}
                <h3>{program.name}</h3>
                <p>{program.description}</p>
                <span className="badge">до {program.maxParticipants} человек</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <h2>Мастера</h2>
        <div className="masters-row">
          {masters.map((master) => (
            <div className="master-card" key={master.id}>
              <img
                src={MASTER_PHOTOS[master.id]}
                alt={master.name}
                className="master-card__photo"
              />
              <strong>{master.name}</strong>
              <span>★ {master.avgRating}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <img src={CTA_PHOTO} alt="" className="home-cta__photo" />
        <div className="home-cta__content">
          <h2>Готовы получить яркие эмоции?</h2>
          <button onClick={() => navigate("/login")}>Войти в мастерскую</button>
        </div>
      </section>
    </div>
  );
}
