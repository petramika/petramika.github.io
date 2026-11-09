import {useState} from 'react';
import {ArrowUpRight, CornerLeftUp, Folder, FolderOpen} from 'lucide-react';
import Pie from '../comun/Pie';
import Manchas from './Manchas';
import {proyectos} from './proyectos';

/*
  Un "Index of /" de los de Apache, pero hecho a mano: las carpetas son los
  proyectos y, en vez de fecha y tamaño, cada una dice de qué va.
*/
export default function Indice() {
  const [arribaAbierto, setArribaAbierto] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col">
      <Manchas />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-14 sm:px-8 sm:pt-24">
        <header>
        <h1 className="mt-2 font-display text-5xl font-black tracking-tight sm:text-7xl">
          Index of <span className="text-suave">/</span>
        </h1>
        <p className="mt-3 inline-block -rotate-2 font-hand text-2xl text-suave sm:text-3xl">
          cosas que exploro, siento, pienso o aprendo
        </p>
        </header>

        <div className="mt-12 sm:mt-16">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[2rem_16rem_1fr_9.5rem_1.5rem] gap-x-5 border-b-2 border-tinta pb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-suave sm:grid"
          >
            <span />
            <span>Nombre</span>
            <span>De qué va</span>
            <span>Vistazo</span>
            <span />
          </div>

          <ul>
            <li className="border-b border-raya">
              <button
                type="button"
                onClick={() => setArribaAbierto((v) => !v)}
                aria-expanded={arribaAbierto}
                className="group grid w-full cursor-pointer grid-cols-[2rem_1fr] items-center gap-x-5 py-3 text-left sm:grid-cols-[2rem_16rem_1fr_9.5rem_1.5rem]"
              >
                <CornerLeftUp className="size-5 text-suave transition-transform group-hover:-translate-y-0.5" strokeWidth={1.75} />
                <span className="font-mono text-suave">../</span>
                <span className="col-start-2 font-hand text-xl text-suave sm:col-start-3" aria-live="polite">
                  {arribaAbierto ? 'Web de una informática que no solo piensa en «Hello World», sino también en el mundo. Para que tengas un poco de historia: este es el tema por defecto de un servidor de PHP, pero con un poquito de magia :)' : ''}
                </span>
              </button>
            </li>

            {proyectos.map((p, i) => (
              <li key={p.ruta} className="border-b border-raya">
                <a
                  href={p.ruta}
                  style={{'--marca': p.marca} as React.CSSProperties}
                  className="group grid grid-cols-[2rem_1fr] items-start gap-x-5 gap-y-1.5 py-6 outline-none sm:grid-cols-[2rem_16rem_1fr_9.5rem_1.5rem]"
                >
                  <span className="relative mt-0.5 size-6">
                    <Folder className="absolute inset-0 size-6 transition-opacity group-hover:opacity-0 group-focus-visible:opacity-0" strokeWidth={1.5} />
                    <FolderOpen className="absolute inset-0 size-6 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" strokeWidth={1.5} />
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="marca break-all font-mono text-base font-medium sm:text-[17px]">{p.nombre}/</span>
                    {p.nota && (
                      <span className="rounded-full border border-raya px-2 py-px font-mono text-[10.5px] uppercase tracking-wider text-suave">
                        {p.nota}
                      </span>
                    )}
                  </span>
                  <span className="col-start-2 max-w-prose leading-relaxed text-suave sm:col-start-3 sm:text-tinta">
                    {p.descripcion}
                  </span>
                  {/* La hoja que sale de la carpeta: entra con un saltito y, al señalarla, se recorre la captura */}
                  <span
                    aria-hidden="true"
                    className="hoja col-start-2 mt-3 sm:col-start-4 sm:mt-0"
                    style={{'--i': i, '--giro': i % 2 ? '2.5deg' : '-2.5deg', '--foco': p.foco ?? '50% 0%'} as React.CSSProperties}
                  >
                    <img src={p.miniatura} alt="" loading="lazy" decoding="async" />
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="mt-1 hidden size-5 text-suave transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-tinta sm:block"
                    strokeWidth={1.75}
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Pie indice />
    </div>
  );
}
