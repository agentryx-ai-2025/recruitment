export function Masthead() {
  return (
    <div className="bg-slate-900 text-white print:hidden">
      {/* Indian Tricolor Strip */}
      <div className="flex h-[3px]">
        <div className="flex-1 bg-[#FF9933]" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-[#138808]" />
      </div>
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-8 2xl:px-12 flex items-center justify-between h-7">
        <span className="text-[11px] text-slate-300">
          An initiative of HPSEDC, Government of Himachal Pradesh
        </span>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
          <a href="#main-content" className="hover:text-white">Skip to Content</a>
          <span className="text-slate-600">|</span>
          <span>Screen Reader</span>
        </div>
      </div>
    </div>
  );
}
