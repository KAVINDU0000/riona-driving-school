import Image from "next/image";
import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white">
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div>
            <Image
              src="/riyona-logo.png"
              alt="Riyona Driving School"
              width={50}
              height={50}
              className="h-12 w-auto mb-4"
            />
            <p className="text-gray-400 text-sm">
              Professional driving school in Sri Lanka offering quality
              training and guidance to become a safe, confident driver.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-bold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="/" className="hover:text-yellow-400 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link href="#lessons" className="hover:text-yellow-400 transition">
                  Lessons
                </Link>
              </li>
              <li>
                <Link href="#learning" className="hover:text-yellow-400 transition">
                  Learning Hub
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-yellow-400 transition">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-bold text-lg mb-4">Services</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link href="#lessons" className="hover:text-yellow-400 transition">
                  Car Lessons
                </Link>
              </li>
              <li>
                <Link href="#lessons" className="hover:text-yellow-400 transition">
                  Van Training
                </Link>
              </li>
              <li>
                <Link href="#lessons" className="hover:text-yellow-400 transition">
                  Motorbike Lessons
                </Link>
              </li>
              <li>
                <Link href="#packages" className="hover:text-yellow-400 transition">
                  Packages
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-lg mb-4">Contact</h3>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>
                <a
                  href="tel:+94123456789"
                  className="hover:text-yellow-400 transition flex items-center gap-2"
                >
                  📞 +94 (0) 123 456 789
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/94123456789"
                  className="hover:text-yellow-400 transition flex items-center gap-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  💬 WhatsApp
                </a>
              </li>
              <li className="flex items-start gap-2">
                📍 Colombo, Sri Lanka
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} Riyona Driving School. All rights reserved.
            </p>
            <div className="flex gap-4 mt-4 md:mt-0">
              <a
                href="#"
                className="text-gray-400 hover:text-yellow-400 transition"
                title="Facebook"
              >
                f
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-yellow-400 transition"
                title="Instagram"
              >
                📸
              </a>
              <a
                href="#"
                className="text-gray-400 hover:text-yellow-400 transition"
                title="LinkedIn"
              >
                in
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
