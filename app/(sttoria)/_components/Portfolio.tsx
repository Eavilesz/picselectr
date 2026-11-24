import Image, { type StaticImageData } from "next/image";
import Eyebrow from "./Eyebrow";
import chapel from "../_images/chapel.jpg";
import hands from "../_images/hands.jpg";
import flowers from "../_images/flowers.jpg";
import veil from "../_images/veil.jpg";

type Photo = {
  src: StaticImageData;
  alt: string;
  wide: boolean;
  position?: string;
};

// Two rows, wide and narrow photos alternating sides
const rows: Photo[][] = [
  [
    {
      src: chapel,
      alt: "Novios frente al altar de una capilla junto al mar",
      wide: true,
      position: "object-[center_40%]",
    },
    {
      src: hands,
      alt: "La novia apoya la mano con su anillo sobre el pecho del novio",
      wide: false,
    },
  ],
  [
    {
      src: flowers,
      alt: "Arreglos florales blancos en las bancas de la capilla",
      wide: false,
    },
    {
      src: veil,
      alt: "Novios sonriendo bajo el velo en el campo",
      wide: true,
      position: "object-[center_35%]",
    },
  ],
];

export default function Portfolio() {
  return (
    <section
      id="portafolio"
      aria-labelledby="portafolio-title"
      className="bg-graphite border-y border-white/[0.06] px-5 pb-24 pt-24 text-[#f1ebe2] sm:px-10 lg:px-16 lg:pb-38 lg:pt-44"
    >
      <div className="mx-auto max-w-298">
        <div className="reveal mb-14 flex flex-col items-center text-center lg:mb-26">
          <Eyebrow centered className="mb-7">
            Portafolio
          </Eyebrow>
          <h2
            id="portafolio-title"
            className="font-serif text-[clamp(44px,5.4vw,80px)] font-light leading-none"
          >
            Momentos
          </h2>
          <p aria-hidden className="mt-1 font-script text-[clamp(40px,4.4vw,64px)] leading-[1.2] text-brand-orange">
            que permanecen
          </p>
        </div>

        <div className="flex flex-col gap-3 md:gap-6">
          {rows.map((row, r) => (
            <div key={r} className="flex flex-wrap gap-3 md:gap-6">
              {row.map((photo) => (
                <figure
                  key={photo.alt}
                  className={`reveal group relative overflow-hidden ${
                    photo.wide ? "flex-[1.7_1_420px]" : "flex-[1_1_260px]"
                  } ${r === 0 ? "h-[clamp(320px,40vw,600px)]" : "h-[clamp(300px,34vw,520px)]"}`}
                >
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes={photo.wide ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 768px) 40vw, 100vw"}
                    placeholder="blur"
                    className={`object-cover transition-transform duration-[1600ms] ease-luxe group-hover:scale-[1.045] ${photo.position ?? ""}`}
                  />
                </figure>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
