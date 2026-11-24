import { services } from "@/lib/site";
import Eyebrow from "./Eyebrow";

export default function Services() {
  const [weddings, ...others] = services;

  return (
    <section
      id="servicios"
      aria-labelledby="servicios-title"
      className="mx-auto max-w-330 px-5 py-24 sm:px-10 lg:px-16 lg:py-44"
    >
      <div className="reveal mb-14 flex flex-wrap items-end justify-between gap-x-20 gap-y-6 lg:mb-26">
        <div className="flex-[1_1_420px]">
          <Eyebrow className="mb-7">Servicios</Eyebrow>
          <h2
            id="servicios-title"
            className="font-serif text-[clamp(40px,4.6vw,68px)] font-light leading-[1.05]"
          >
            Para los momentos <em>que importan</em>
          </h2>
        </div>
        <p className="flex-[0_1_360px] text-[15px] leading-[1.9] text-muted">
          Las bodas son nuestro centro. Con la misma dedicación, creamos
          sesiones y celebraciones a la medida de cada cliente.
        </p>
      </div>

      <article className="reveal flex flex-wrap items-baseline gap-x-16 gap-y-6 border-y border-line py-12">
        <span aria-hidden className="flex-[0_0_72px] font-serif text-[28px] italic text-brand-orange-deep">
          01
        </span>
        <h3 className="flex-[1_1_300px] font-serif text-[clamp(44px,5vw,72px)] font-light leading-none">
          {weddings.name}
        </h3>
        <div className="flex-[1_1_380px]">
          <p className="mb-6 text-[15px] leading-[1.9] text-muted">
            {weddings.description}
          </p>
          <p className="text-[11px] font-normal uppercase tracking-[0.3em]">
            {weddings.includes.join(" · ")}
          </p>
        </div>
      </article>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-x-14">
        {others.map((service, i) => (
          <article key={service.name} className="reveal border-b border-line py-12">
            <span aria-hidden className="font-serif text-2xl italic text-brand-orange-deep">
              {String(i + 2).padStart(2, "0")}
            </span>
            <h3 className="mb-4 mt-5 font-serif text-[32px] leading-[1.1]">
              {service.name}
            </h3>
            <p className="text-[15px] leading-[1.85] text-muted">
              {service.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
