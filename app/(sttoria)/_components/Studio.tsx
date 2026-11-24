import Eyebrow from "./Eyebrow";

export default function Studio() {
  return (
    <section
      id="estudio"
      aria-labelledby="estudio-title"
      className="bg-graphite border-y border-white/[0.06] px-5 text-ivory py-24 sm:px-10 lg:px-16 lg:py-44"
    >
      <div className="reveal mx-auto flex max-w-215 flex-col items-center text-center">
        <Eyebrow centered className="mb-9">
          El estudio
        </Eyebrow>
        <h2
          id="estudio-title"
          className="font-serif text-[clamp(36px,4.4vw,64px)] font-light leading-[1.15]"
        >
          No fotografiamos eventos.
          <br />
          <em>Contamos historias.</em>
        </h2>
        <p className="mt-10 max-w-140 text-base leading-[1.95] text-ivory/75">
          Acompañamos cada celebración con una mirada discreta y un cuidado
          artesanal por cada imagen, para entregar un relato que su familia
          querrá volver a ver durante generaciones.
        </p>
        <p aria-hidden className="mt-10 font-script text-[44px] leading-none text-brand-orange">
          Sttoria
        </p>
      </div>
    </section>
  );
}
