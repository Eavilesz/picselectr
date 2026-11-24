import Image from "next/image";
import Eyebrow from "./Eyebrow";
import windowPhoto from "../_images/window.jpg";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="mx-auto flex max-w-330 flex-wrap items-center gap-12 px-5 pb-20 pt-4 sm:px-10 md:gap-[6vw] lg:px-16 lg:pb-36 lg:pt-10"
    >
      <div className="min-w-0 flex-[1_1_380px]">
        {/* The h1 carries the search keywords; the large line is the mood */}
        <Eyebrow
          as="h1"
          className="mb-8 animate-rise [animation-delay:300ms]"
        >
          Fotografía y video de bodas en Guayaquil
        </Eyebrow>
        <p className="animate-rise font-serif text-[clamp(52px,6.6vw,100px)] font-light leading-none tracking-[-0.01em] [animation-delay:500ms]">
          Cada historia <em>merece</em>
        </p>
        <p className="mt-1.5 animate-rise font-script text-[clamp(48px,5.8vw,88px)] leading-[1.15] text-brand-orange-deep [animation-delay:500ms]">
          ser eterna
        </p>
        <p className="mt-10 max-w-100 animate-rise text-[15px] leading-[1.9] text-muted [animation-delay:750ms]">
          Fotografía y video de bodas para parejas que valoran la luz, los
          detalles y la emoción verdadera de cada instante.
        </p>
      </div>
      <div className="relative aspect-4/5 max-h-195 min-w-0 flex-[1_1_460px] animate-unveil overflow-hidden">
        <Image
          src={windowPhoto}
          alt="Novio besando la frente de la novia junto a una ventana, en blanco y negro cálido"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          placeholder="blur"
          loading="eager"
          fetchPriority="high"
          className="animate-settle object-cover object-[center_30%]"
        />
      </div>
    </section>
  );
}
