import Icon from "@/components/ui/Icon";
import { site } from "@/data/landing";

/** Fixed chat button, bottom-right, matching the green accent in the reference. */
export default function FloatingWhatsApp() {
  return (
    <a
      href={site.whatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Riyona on WhatsApp"
      className="fixed bottom-6 right-6 z-50 grid h-12 w-12 place-items-center rounded-full bg-success text-white shadow-float transition-transform duration-200 hover:scale-105"
    >
      <Icon name="chat" className="h-5 w-5" />
    </a>
  );
}
