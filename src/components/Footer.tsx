import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-12">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">About</h3>
            <ul className="space-y-2">
              <li><Link to="#" className="text-white/60 hover:text-white">About Us</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Careers</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Press</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="#" className="text-white/60 hover:text-white">Blog</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Help Center</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Guidelines</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Legal</h3>
            <ul className="space-y-2">
              <li><Link to="#" className="text-white/60 hover:text-white">Privacy</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Terms</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Cookie Policy</Link></li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact</h3>
            <ul className="space-y-2">
              <li><Link to="#" className="text-white/60 hover:text-white">Support</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Sales</Link></li>
              <li><Link to="#" className="text-white/60 hover:text-white">Partners</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-white/60">
          <p>&copy; {new Date().getFullYear()} Venturezon. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
