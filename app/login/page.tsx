'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });

        if (res.ok) {
            router.push('/private');
            router.refresh();
        } else {
            setError('Access Denied');
            setIsLoading(false);
            setPassword('');
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-200">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8"
            >
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="mb-6 p-4 rounded-full bg-neutral-900 border border-neutral-800"
                    >
                        <Lock className="w-6 h-6 text-neutral-400" />
                    </motion.div>
                    <h1 className="text-xl font-medium tracking-wide text-neutral-400">RESTRICTED AREA</h1>
                    <p className="mt-2 text-sm text-neutral-600">Enter your credentials to proceed</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative group">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Passkey"
                            className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 outline-none text-neutral-300 placeholder-neutral-600 focus:border-neutral-600 transition-all font-mono tracking-widest text-center"
                            autoFocus
                        />
                        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                    </div>

                    {error && (
                        <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-red-500/80 text-xs text-center font-mono"
                        >
                            {error}
                        </motion.p>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-neutral-100 text-neutral-950 py-3 rounded-lg font-medium hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-neutral-950/30 border-t-neutral-950 rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Authenticate</span>
                                <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-[10px] text-neutral-700 uppercase tracking-widest">
                        Secure System • Authorized Personnel Only
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
