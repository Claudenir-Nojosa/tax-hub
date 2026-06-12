// app/page.tsx
import Image from "next/image";
import Link from "next/link";

export default async function RootPage() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950 overflow-hidden">
      {/* Background gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-br from-[#00cfec] via-[#007cca] to-[#00cfec] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>

      {/* Content */}
      <div className="flex flex-col items-center gap-8 px-4 text-center">
        {/* Logo + wordmark */}
        <div className="flex items-center gap-3">
          <Image
            src="https://github.com/Claudenir-Nojosa/servidor_estaticos/blob/main/logo.png?raw=true"
            alt="tax-hub Logo"
            width={40}
            height={40}
          />
          <span className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            tax-hub
          </span>
        </div>

        {/* Tagline */}
        <div className="space-y-2 max-w-xs">
          <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
            Tributário na essência. Tecnologia na prática.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
          <Link
            href="/login"
            className="w-full text-center rounded-xl bg-[#007cca] hover:bg-[#006bb0] text-white text-sm font-medium px-6 py-2.5 transition-colors duration-150"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="w-full text-center rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 text-sm font-medium px-6 py-2.5 transition-colors duration-150"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}