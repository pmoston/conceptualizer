import Link from "next/link";
import { HelpCircle } from "lucide-react";

export default function HelpLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      title="Help"
      className="text-gray-300 hover:text-[#b3cc26] transition-colors"
    >
      <HelpCircle size={15} />
    </Link>
  );
}
