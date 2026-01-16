
import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 flex flex-col items-center justify-center p-4">
            {/* Background Blobs for specific Corporate Joy aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[10%] left-[10%] w-96 h-96 bg-indigo-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                <div className="absolute top-[10%] right-[10%] w-96 h-96 bg-amber-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                <div className="absolute bottom-[20%] left-[50%] -translate-x-1/2 w-96 h-96 bg-emerald-200/40 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
            </div>

            <div className="relative z-10 text-center max-w-2xl px-6">
                {/* Animated 404 */}
                <div className="font-display font-black text-9xl text-indigo-900/10 select-none mb-8 animate-pulse">
                    404
                </div>

                <div className="space-y-6 -mt-24">
                    <div className="inline-flex items-center justify-center w-24 h-24 mb-6 transform rotate-12 transition-transform hover:rotate-0 duration-300 p-4">
                        <Image
                            src="/logo.png"
                            alt="Travyntra Logo"
                            width={80}
                            height={80}
                            className="object-contain rounded-md"
                        />
                    </div>

                    <h1 className="font-display text-4xl md:text-5xl font-bold text-slate-900">
                        Destination Unknown
                    </h1>

                    <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
                        We couldn't locate the flight path for <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded">this page</span>.
                        It might have been delayed, cancelled, or never existed in the first place.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-all hover:shadow-lg shadow-indigo-200 hover:-translate-y-0.5"
                        >
                            Return Home
                        </Link>
                        <Link
                            href="/login"
                            className="inline-flex items-center justify-center px-8 py-3 bg-white text-slate-700 border border-slate-200 font-semibold rounded-full hover:bg-slate-50 transition-all hover:border-slate-300"
                        >
                            Go to Dashboard
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer decoration */}
            <div className="absolute bottom-8 text-center text-slate-400 text-sm font-medium">
                Travyntra
            </div>
        </div>
    )
}
