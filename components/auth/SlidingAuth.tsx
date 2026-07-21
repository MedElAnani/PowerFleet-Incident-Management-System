"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// Google SVG Icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 } 
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

export default function SlidingAuth() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const [registerName, setRegisterName] = useState("")
  const [registerEmail, setRegisterEmail] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [phone, setPhone] = useState("")

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError(null);
    setSuccess(null);
  };

  const handleAuthError = (err: unknown, defaultMessage: string) => {
    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || defaultMessage);
    } else if (err instanceof Error) {
      setError(err.message || "An unexpected error occurred.");
    } else {
      setError("An unexpected error occurred.");
    }
  };

  const getValidationClasses = (value: string, type: 'email' | 'password' | 'name' | 'phone') => {
    if (value.length === 0) return "border-slate-200 dark:border-slate-800 focus:border-emerald-500 focus:ring-emerald-500";
    let isValid = false;
    if (type === 'email') isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (type === 'password') isValid = /^[A-Z](?=.*[0-9])(?=.*[^a-zA-Z0-9]).{4,}$/.test(value);
    if (type === 'name') isValid = value.trim().length >= 2;
    if (type === 'phone') isValid = value.trim().length >= 8;
    return isValid
      ? "border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500"
      : "border-red-500 focus:border-red-500 focus:ring-red-500";
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try{
      await axios.post('/api/auth/login', {
        email,
        password
      });
      setSuccess("Successfully logged in! Redirecting...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    }catch(err: unknown){
      handleAuthError(err, "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try{
      await axios.post('/api/auth/register', {
        name: registerName,
        companyName,
        phone,
        email: registerEmail,
        password: registerPassword
      });
      setSuccess("Account created! Redirecting to login...");
      setTimeout(() => {
        toggleMode(true);
      }, 2000);
    }catch(err: unknown){
      handleAuthError(err, "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[85vh] w-full max-w-7xl mx-auto flex-col bg-white dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 antialiased selection:bg-emerald-500/20 selection:text-emerald-500 lg:flex-row shadow-2xl rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
      
      {/* Sliding Image Panel */}
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`relative hidden w-full p-4 lg:flex lg:w-1/2 z-10 ${isLogin ? 'order-2' : 'order-1'}`}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-slate-900 shadow-xl">
          <img
            src="https://assets.watermelon.sh/auth-12.avif"
            alt="Abstract wavy gradient"
            className="absolute inset-0 h-full w-full object-cover opacity-80"
          />
          {/* Logo overlay */}
          <div className="absolute top-8 left-8 z-20 flex flex-col">
            <h2 className="text-3xl font-extrabold text-white tracking-tighter drop-shadow-md">
              POWER FLEET <span className="text-emerald-400">IMS</span>
            </h2>
            <p className="text-white/80 font-medium mt-1 drop-shadow-md">
              Next-generation fleet management.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Sliding Form Panel */}
      <motion.div 
        layout
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`flex w-full flex-col items-center justify-center p-6 sm:p-12 lg:w-1/2 z-20 bg-white dark:bg-slate-900 ${isLogin ? 'order-1' : 'order-2'}`}
      >
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.div
              key="login"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-[400px]"
            >
              <motion.div variants={itemVariants} className="mb-10">
                <h1 className="mb-4 text-[48px] font-semibold leading-[1.05] tracking-tight text-slate-900 dark:text-white">
                  Welcome
                  <br />
                  back
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 text-balance">
                  You need to be signed in to access the fleet dashboard.
                </p>
              </motion.div>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {success}
                  </div>
                )}
                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="login-email" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.costa@example.com"
                    className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(email, 'email')}`}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="login-password" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-[14px] font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(password, 'password')}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-2.5">
                    <input
                      id="remember"
                      name="remember"
                      type="checkbox"
                      className="size-[18px] rounded border-slate-300 dark:border-slate-700 text-emerald-500 focus:ring-emerald-500 transition-colors bg-white dark:bg-slate-950"
                    />
                    <label htmlFor="remember" className="text-[14px] text-slate-600 dark:text-slate-400">
                      Keep me signed in
                    </label>
                  </div>
                  <button type="button" className="text-[14px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline transition-colors">
                    Forgot password?
                  </button>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex justify-center items-center w-full rounded-md bg-emerald-500 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98] hover:bg-emerald-600 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Sign in"}
                  </button>
                </motion.div>
              </form>

              <motion.div variants={itemVariants} className="mt-4">
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 text-[14px] font-medium text-slate-700 dark:text-slate-200 transition-transform active:scale-[0.98] hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <GoogleIcon className="size-[18px]" />
                  Sign in with Google
                </button>
              </motion.div>

              <motion.div variants={itemVariants} className="mt-10 text-center text-[14px] text-slate-500 dark:text-slate-400">
                Haven&apos;t joined yet?{" "}
                <button 
                  type="button"
                  onClick={() => toggleMode(false)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  Sign up
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full max-w-[400px]"
            >
              <motion.div variants={itemVariants} className="mb-10">
                <h1 className="mb-4 text-[48px] font-semibold leading-[1.05] tracking-tight text-slate-900 dark:text-white">
                  Join
                  <br />
                  Power Fleet
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-slate-400 text-balance">
                  Create your account to start managing your incidents effectively.
                </p>
              </motion.div>

              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-5">
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/50 p-3 text-sm text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {success}
                  </div>
                )}
                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="register-name" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Full Name
                  </label>
                  <input
                    id="register-name"
                    name="fullName"
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="John Doe"
                    className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(registerName, 'name')}`}
                  />
                </motion.div>

                <div className="flex gap-4">
                  <motion.div variants={itemVariants} className="flex flex-col gap-2 w-1/2">
                    <label htmlFor="register-company" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                      Company Name
                    </label>
                    <input
                      id="register-company"
                      name="companyName"
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Acme Corp"
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(companyName, 'name')}`}
                    />
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex flex-col gap-2 w-1/2">
                    <label htmlFor="register-phone" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                      Phone Number
                    </label>
                    <input
                      id="register-phone"
                      name="phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+212..."
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(phone, 'phone')}`}
                    />
                  </motion.div>
                </div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="register-email" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Email address
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="john@example.com"
                    className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(registerEmail, 'email')}`}
                  />
                </motion.div>

                <motion.div variants={itemVariants} className="flex flex-col gap-2">
                  <label htmlFor="register-password" className="text-[14px] font-medium text-slate-800 dark:text-slate-200">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="register-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full rounded-md border bg-white dark:bg-slate-950 px-4 py-3 pr-10 text-[14px] font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors ${getValidationClasses(registerPassword, 'password')}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="mt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex justify-center items-center w-full rounded-md bg-emerald-500 py-3 text-[14px] font-medium text-white transition-transform active:scale-[0.98] hover:bg-emerald-600 disabled:opacity-70 disabled:pointer-events-none"
                  >
                    {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Create account"}
                  </button>
                </motion.div>
              </form>

              <motion.div variants={itemVariants} className="mt-10 text-center text-[14px] text-slate-500 dark:text-slate-400">
                Already have an account?{" "}
                <button 
                  type="button"
                  onClick={() => toggleMode(true)}
                  className="font-semibold text-slate-800 dark:text-slate-200 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors"
                >
                  Sign in
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
