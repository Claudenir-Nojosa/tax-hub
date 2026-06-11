import { useRouter, usePathname } from "next/navigation";

export function scrollToSection(id: string, lang = "pt") {
  const el = document.getElementById(id);

  if (el) {
    const navbar = document.querySelector("header");
    const offset = navbar?.offsetHeight ?? 96;

    const y =
      el.getBoundingClientRect().top +
      window.pageYOffset -
      offset;

    window.scrollTo({
      top: y,
      behavior: "smooth",
    });

    return;
  }

  // ⛔ não está na home → navegar primeiro
  window.location.href = `/${lang}#${id}`;
}
