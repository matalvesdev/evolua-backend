export function TestimonialCard() {
  return (
    <div className="w-full md:w-5/12 hidden md:block relative overflow-hidden bg-purple-50 group">
      {/* Overlay */}
      <div className="absolute inset-0 bg-purple-600/20 mix-blend-overlay z-10"></div>
      <div className="absolute inset-0 bg-linear-to-t from-purple-600/60 via-transparent to-transparent z-10 opacity-80"></div>
      
      {/* Background Image */}
      <div 
        className="h-full w-full bg-cover bg-center transition-transform duration-[2s] ease-in-out group-hover:scale-105"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070')"
        }}
      />
      
      {/* Testimonial */}
      <div className="absolute bottom-12 left-8 right-8 z-20">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 shadow-xl p-6 rounded-2xl text-white transform transition-all hover:-translate-y-1 duration-300">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-yellow-300 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <div>
              <p className="font-semibold text-lg leading-snug text-white drop-shadow-sm">
                &ldquo;A Evolua transformou minha gestão clínica.&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-1 w-12 bg-white/60 rounded-full"></div>
                <p className="text-xs text-white/90 font-medium uppercase tracking-wider">
                  Simplifique sua rotina
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
