import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-100">
      <div className="container mx-auto px-4 py-12">
        {/* left Content */}
        <div className="grid grid-cols-1 md:grid-cols-[400px_1fr] gap-10">
          {/* Left block: Logo + blurb + badges */}
          <div className="">
            <div className="mb-8">
              <Image
                src="/thelaunchpad.png"
                alt="The launch Pad"
                width={40}
                height={40}
              />
              <p className="text-sm text-muted-foreground">
                The Launch Pad brings professional car detailing right to your
                home. Confidently book the best car detailers in your area
                today!
              </p>
            </div>
            <div>
              <Link
                href="https://www.bbb.org/ca/on/etobicoke/profile/auto-detailing/panda-hub-0107-1395635"
                target="_blank"
                className="block"
              >
                <img
                  src="https://cdn.prod.website-files.com/655391a7777dd2b60016fdf2/66140228f643911dbaeed0c4_Panda_Hub_BBB.webp"
                  alt="Panda Hub Accredited Business Badge"
                  className="h-10 w-auto rounded"
                />
              </Link>
            </div>
          </div>

          {/* Right block: link columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-b border-gray-300 py-6">
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">
                The Launch Pad
              </div>
              <Link
                href="/about"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                About
              </Link>
              <Link
                href="/products"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Products
              </Link>
              <Link
                href="/blog"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Blog
              </Link>
              <Link
                href="/reviews"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Reviews
              </Link>
              <Link
                href="/careers"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Careers
              </Link>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-foreground">
                Services
              </div>
              <Link
                href="/pricing"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Pricing
              </Link>
              <Link
                href="/car-detailing"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Profesional Detailing
              </Link>
              <Link
                href="/interior-car-detailing"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Interior Car Detailing
              </Link>
              <Link
                href="/exterior-car-detailing"
                className="block text-sm text-muted-foreground hover:text-foreground"
              >
                Exterior Car Detailing
              </Link>
            </div>
          </div>
        </div>

        {/* Right Content */}
      

        {/* legal + socials */}
        <div className="flex flex-col md:items-center justify-between gap-4 border-t border-gray-300 py-5">
          <div className="flex flex-col md:flex-row items-center gap-3 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} The Launch Pad</span>
            <span className="hidden md:inline">•</span>
            <div className="flex items-center gap-3">
              <Link
                href="/legal/privacy-policy"
                className="hover:text-foreground"
              >
                Privacy
              </Link>
              <span>•</span>
              <Link
                href="/legal/terms-of-service"
                className="hover:text-foreground"
              >
                Terms
              </Link>
              <span>•</span>
              <Link
                href="https://www.pandahub.com/sitemap.xml"
                className="hover:text-foreground"
              >
                Sitemap
              </Link>
              <span>•</span>
              <Link href="/llm-info" className="hover:text-foreground">
                Hey AI, learn about us
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3">
            {/* Social icons */}
            <Link
              aria-label="TikTok"
              href="https://www.tiktok.com/@pandahubinc?lang=en"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14.9525 6.124C14.2867 5.98158 13.6838 5.63023 13.2317 5.12117C12.7796 4.6121 12.5019 3.97194 12.4391 3.294V3H10.1425V12.1147C10.141 12.5182 10.0132 12.9111 9.77696 13.2382C9.54071 13.5654 9.20789 13.8102 8.82529 13.9385C8.44268 14.0667 8.02951 14.0718 7.64385 13.9531C7.25819 13.8344 6.91941 13.5978 6.67512 13.2767C6.42704 12.9501 6.28943 12.553 6.28223 12.143C6.27504 11.733 6.39863 11.3313 6.6351 10.9963C6.87157 10.6612 7.20861 10.4102 7.59735 10.2796C7.9861 10.149 8.40633 10.1457 8.79712 10.27V7.93667C7.92569 7.8162 7.0384 7.97113 6.25935 8.37978C5.48031 8.78843 4.84848 9.43036 4.45224 10.2158C4.056 11.0012 3.91517 11.8909 4.04944 12.7603C4.18372 13.6297 4.58639 14.4354 5.20112 15.0647C5.78736 15.6645 6.53904 16.076 7.36022 16.2467C8.1814 16.4175 9.03483 16.3396 9.81155 16.0231C10.5883 15.7066 11.2531 15.1658 11.7211 14.4698C12.1891 13.7738 12.4391 12.9541 12.4391 12.1153V7.458C13.3673 8.12156 14.4802 8.47736 15.6211 8.47533V6.19333C15.3964 6.19361 15.1723 6.17037 14.9525 6.124Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              aria-label="Facebook"
              href="https://www.facebook.com/Pandahubinc/"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M7.26309 10.4334H8.65289V16.4503C8.65289 16.5691 8.74442 16.6654 8.85739 16.6654H11.2138C11.3268 16.6654 11.4183 16.5691 11.4183 16.4503V10.4617H13.016C13.1199 10.4617 13.2073 10.3797 13.2192 10.2712L13.4618 8.05607C13.4685 7.99513 13.4501 7.9341 13.4114 7.88837C13.3725 7.84261 13.317 7.81642 13.2587 7.81642H11.4184V6.42786C11.4184 6.00928 11.6327 5.79702 12.0555 5.79702C12.1157 5.79702 13.2587 5.79702 13.2587 5.79702C13.3717 5.79702 13.4632 5.70072 13.4632 5.58197V3.54868C13.4632 3.42988 13.3717 3.33362 13.2587 3.33362H11.6005C11.5888 3.33302 11.5628 3.33203 11.5245 3.33203C11.2368 3.33203 10.2367 3.39143 9.44666 4.15573C8.57134 5.0027 8.69301 6.01681 8.72209 6.19263V7.81637H7.26309C7.15013 7.81637 7.05859 7.91263 7.05859 8.03143V10.2183C7.05859 10.3371 7.15013 10.4334 7.26309 10.4334Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              aria-label="X (Twitter)"
              href="https://x.com/pandahubinc"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M2.9331 3.33203L8.4332 10.6861L2.89844 16.6654H4.14414L8.98989 11.4304L12.9051 16.6654H17.1441L11.3346 8.89751L16.4863 3.33203H15.2406L10.778 8.15325L7.1723 3.33203H2.9331ZM4.7651 4.24961H6.71248L15.312 15.7476H13.3646L4.7651 4.24961Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              aria-label="Instagram"
              href="https://www.instagram.com/pandahubinc/"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M11.9697 10.0007C11.9697 10.4226 11.8446 10.835 11.6102 11.1859C11.3759 11.5367 11.0428 11.8101 10.6531 11.9716C10.2633 12.1331 9.83451 12.1753 9.42079 12.093C9.00706 12.0107 8.62704 11.8075 8.32876 11.5091C8.03048 11.2108 7.82735 10.8307 7.74506 10.4168C7.66276 10.003 7.705 9.57407 7.86642 9.18426C8.02785 8.79444 8.30122 8.46126 8.65196 8.22685C9.00269 7.99244 9.41505 7.86732 9.83688 7.86732C10.4023 7.86796 10.9444 8.09293 11.3443 8.49287C11.7441 8.89281 11.969 9.43505 11.9697 10.0007ZM16.5019 7.06732V12.934C16.5008 13.9238 16.1072 14.8727 15.4074 15.5726C14.7077 16.2725 13.759 16.6662 12.7695 16.6673H6.90428C5.91473 16.6662 4.96603 16.2725 4.26631 15.5726C3.56659 14.8727 3.173 13.9238 3.17188 12.934V7.06732C3.173 6.07752 3.56659 5.12858 4.26631 4.42869C4.96603 3.7288 5.91473 3.33511 6.90428 3.33398H12.7695C13.759 3.33511 14.7077 3.7288 15.4074 4.42869C16.1072 5.12858 16.5008 6.07752 16.5019 7.06732ZM13.0361 10.0007C13.0361 9.36775 12.8484 8.74906 12.4969 8.22283C12.1454 7.69659 11.6457 7.28644 11.0612 7.04424C10.4766 6.80204 9.83333 6.73867 9.21274 6.86214C8.59216 6.98561 8.02212 7.29038 7.5747 7.73791C7.12728 8.18544 6.82259 8.75562 6.69915 9.37636C6.57571 9.9971 6.63906 10.6405 6.8812 11.2252C7.12334 11.81 7.53339 12.3097 8.05949 12.6614C8.5856 13.013 9.20413 13.2007 9.83688 13.2007C10.6851 13.1997 11.4982 12.8622 12.098 12.2623C12.6978 11.6624 13.0351 10.849 13.0361 10.0007ZM14.1025 6.53398C14.1025 6.37576 14.0556 6.22109 13.9677 6.08953C13.8798 5.95797 13.7549 5.85543 13.6087 5.79488C13.4626 5.73433 13.3018 5.71849 13.1466 5.74936C12.9915 5.78022 12.849 5.85642 12.7371 5.9683C12.6253 6.08018 12.5491 6.22273 12.5182 6.37791C12.4874 6.5331 12.5032 6.69395 12.5638 6.84013C12.6243 6.98631 12.7268 7.11125 12.8583 7.19916C12.9899 7.28707 13.1445 7.33398 13.3027 7.33398C13.5148 7.33398 13.7182 7.2497 13.8682 7.09967C14.0182 6.94964 14.1025 6.74616 14.1025 6.53398Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              aria-label="LinkedIn"
              href="https://linkedin.com/company/pandahub"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M6.87516 6.50586H4.32952C4.21655 6.50586 4.125 6.60237 4.125 6.72138V15.3392C4.125 15.4582 4.21655 15.5547 4.32952 15.5547H6.87516C6.98814 15.5547 7.07969 15.4582 7.07969 15.3392V6.72138C7.07969 6.60237 6.98814 6.50586 6.87516 6.50586Z"
                  fill="currentColor"
                />
                <path
                  d="M5.59777 2.2207C4.67152 2.2207 3.91797 3.01391 3.91797 3.98889C3.91797 4.9643 4.67152 5.75781 5.59777 5.75781C6.52329 5.75781 7.27622 4.96426 7.27622 3.98889C7.27627 3.01391 6.52329 2.2207 5.59777 2.2207Z"
                  fill="currentColor"
                />
                <path
                  d="M13.3453 6.29297C12.3229 6.29297 11.5671 6.75613 11.1087 7.28239V6.72268C11.1087 6.60367 11.0171 6.50715 10.9041 6.50715H8.46624C8.35326 6.50715 8.26172 6.60367 8.26172 6.72268V15.3405C8.26172 15.4595 8.35326 15.556 8.46624 15.556H11.0063C11.1193 15.556 11.2108 15.4595 11.2108 15.3405V11.0767C11.2108 9.63986 11.5812 9.0801 12.5317 9.0801C13.5668 9.0801 13.6491 9.97745 13.6491 11.1506V15.3405C13.6491 15.4596 13.7406 15.556 13.8536 15.556H16.3946C16.5076 15.556 16.5991 15.4596 16.5991 15.3405V10.6135C16.5991 8.47703 16.2125 6.29297 13.3453 6.29297Z"
                  fill="currentColor"
                />
              </svg>
            </Link>
            <Link
              aria-label="YouTube"
              href="https://www.youtube.com/@pandahubinc"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M16.7761 6.57018C16.6961 6.26915 16.5384 5.9944 16.3189 5.77345C16.0993 5.55249 15.8256 5.39307 15.5251 5.31115C14.4188 5.01367 9.99691 5.01367 9.99691 5.01367C9.99691 5.01367 5.57501 5.01367 4.46874 5.31115C4.16822 5.39307 3.89449 5.55249 3.67495 5.77345C3.4554 5.9944 3.29774 6.26915 3.21774 6.57018C2.92188 7.68128 2.92188 9.99836 2.92188 9.99836C2.92188 9.99836 2.92188 12.3154 3.21774 13.4265C3.29774 13.7276 3.4554 14.0023 3.67495 14.2233C3.89449 14.4442 4.16822 14.6036 4.46874 14.6856C5.57501 14.983 9.99691 14.983 9.99691 14.983C9.99691 14.983 14.4188 14.983 15.5251 14.6856C15.8256 14.6036 16.0993 14.4442 16.3189 14.2233C16.5384 14.0023 16.6961 13.7276 16.7761 13.4265C17.072 12.3154 17.072 9.99836 17.072 9.99836C17.072 9.99836 17.072 7.68128 16.7761 6.57018Z"
                  fill="currentColor"
                />
                <path
                  d="M8.54688 12.1026V7.89453L12.2452 9.99855L8.54688 12.1026Z"
                  fill="#F5F5F7"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
