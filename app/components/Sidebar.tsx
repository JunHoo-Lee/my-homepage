import Image from "next/image";
import Link from "next/link";
import { Mail, Github, Linkedin, GraduationCap, MapPin } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-full md:w-64 md:h-screen md:fixed left-0 top-0 bg-gray-50 border-r border-gray-200 p-6 flex flex-col items-center text-center overflow-y-auto z-10">
      <div className="mb-6">
        <div className="w-40 h-40 relative rounded-full overflow-hidden border-4 border-white shadow-lg mx-auto">
          <Image
            src="/myface.jpeg"
            alt="Junhoo Lee"
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Junhoo Lee</h1>
      <p className="text-gray-600 font-medium mb-1">PhD Student</p>
      <p className="text-sm text-gray-500 mb-4">Seoul National University (MIPAL)</p>

      <div className="flex flex-col gap-2 w-full mb-8 text-sm">
        <a href="mailto:mrjunoo@snu.ac.kr" className="flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
          <Mail size={16} /> mrjunoo@snu.ac.kr
        </a>
        <div className="flex justify-center gap-4 mt-2">
          <a href="https://github.com/JunHoo-Lee" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-gray-900 transition-transform hover:scale-110">
            <Github size={20} />
          </a>
          <a href="https://scholar.google.com/citations?user=CvvfGxkAAAAJ&hl=ko&authuser=3" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-transform hover:scale-110">
            <GraduationCap size={20} />
          </a>
          <a href="https://www.linkedin.com/in/junhoo-lee-8483b62a5/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-700 transition-transform hover:scale-110">
            <Linkedin size={20} />
          </a>
        </div>
      </div>

      <nav className="w-full flex-1">
        <ul className="space-y-2 text-sm font-medium text-gray-600">
          <li><Link href="/#about" className="block py-2 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">About Me</Link></li>
          <li><Link href="/#news" className="block py-2 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">News</Link></li>
          <li><Link href="/#publications" className="block py-2 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">Publications</Link></li>
        </ul>

        {/* Private Links - Discrete */}
        <div className="mt-8 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Personal</p>
          <ul className="space-y-2 text-sm font-medium text-gray-600">
            <li><Link href="/tasks" className="block py-2 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">Tasks</Link></li>
            <li><Link href="/papers" className="block py-2 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors">Papers</Link></li>
          </ul>
        </div>
      </nav>

      <div className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Junhoo Lee
      </div>
    </aside>
  );
}
