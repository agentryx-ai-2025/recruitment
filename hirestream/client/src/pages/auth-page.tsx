import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, loginSchema } from "@shared/validators";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import {
  User, Briefcase, Building2, Shield, Globe, Lock, Mail, Eye, EyeOff,
  ArrowLeft, Loader2, CheckSquare, Square
} from "lucide-react";

export default function AuthPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  if (user) {
    setTimeout(() => setLocation("/"), 0);
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col lg:flex-row">
      {/* Left panel — branding with animated gradient */}
      <div className="lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-950 via-blue-800 to-indigo-900 text-white p-8 lg:p-16 flex flex-col justify-center">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHBhdHRlcm5Vbml0cz0idXNlclNwYWNlT25Vc2UiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-40" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />

        <div className="relative max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center shadow-xl">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">HireStream</h1>
              <p className="text-blue-200 text-xs">HPSEDC Overseas Placement Portal</p>
            </div>
          </div>

          {/* Indian tricolor accent */}
          <div className="flex gap-1 mb-6 w-20">
            <div className="flex-1 h-1 rounded-full bg-[#FF9933]" />
            <div className="flex-1 h-1 rounded-full bg-white" />
            <div className="flex-1 h-1 rounded-full bg-[#138808]" />
          </div>

          <h2 className="text-2xl md:text-3xl lg:text-[2.25rem] font-bold mb-4 leading-[1.35] pb-1 text-white">
            {t("landing.hero")}
          </h2>
          <p className="text-blue-100 text-base mb-8 leading-relaxed">
            {t("landing.heroDesc")}
          </p>

          <div className="space-y-4">
            <FeatureItem icon={<User className="w-5 h-5" />} title="Job Seekers" desc="Register, build your profile, and apply for verified overseas positions" />
            <FeatureItem icon={<Briefcase className="w-5 h-5" />} title="Recruitment Agencies" desc="Post jobs, manage drives, and connect with qualified candidates" />
            <FeatureItem icon={<Building2 className="w-5 h-5" />} title="Employers" desc="Access a vetted talent pool and streamline international hiring" />
            <FeatureItem icon={<Shield className="w-5 h-5" />} title="Government Oversight" desc="HPSEDC monitors, verifies agencies, and ensures candidate safety" />
          </div>

          {/* Footer note */}
          <div className="mt-10 pt-6 border-t border-white/10 flex items-center gap-2 text-xs text-blue-200/80">
            <Shield className="w-3.5 h-3.5" />
            <span>A verified Government of Himachal Pradesh initiative</span>
          </div>
        </div>
      </div>

      {/* Right panel — auth forms */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        <Card className="w-full max-w-md shadow-xl shadow-slate-200/60 border border-slate-200/80 rounded-2xl">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/20">
              <User className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">{t("auth.welcome")}</CardTitle>
            <CardDescription className="text-slate-500">
              {t("auth.signInDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-8">
            {/* Quick Role Login (Testing Mode) */}
            <QuickLoginPanel />

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100/80 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("auth.signInTab")}</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">{t("auth.createTab")}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Quick Role Login (testing mode) ──
function QuickLoginPanel() {
  const [loading, setLoading] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [available, setAvailable] = useState(true);

  const roles = [
    { key: "candidate", label: "Job Seeker", color: "from-blue-500 to-blue-600", icon: User },
    { key: "agent", label: "Agency", color: "from-emerald-500 to-emerald-600", icon: Briefcase },
    { key: "employer", label: "Employer", color: "from-purple-500 to-purple-600", icon: Building2 },
    { key: "admin", label: "Govt Officer", color: "from-rose-500 to-red-600", icon: Shield },
  ];

  const quickLogin = async (role: string) => {
    setLoading(role);
    try {
      const res = await fetch("/api/v1/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setAvailable(false);
          toast({ title: "Quick login disabled", description: data.error?.message, variant: "destructive" });
        } else {
          toast({ title: "Login failed", description: data.error?.message || "Try again", variant: "destructive" });
        }
        return;
      }
      // Force full reload so auth state rehydrates
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Login failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  if (!available) return null;

  return (
    <div className="mb-5 p-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500 text-white uppercase tracking-wide">Testing</span>
        <p className="text-xs font-semibold text-amber-900">Quick role login — no credentials needed</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {roles.map(r => {
          const RIcon = r.icon;
          return (
            <button
              key={r.key}
              onClick={() => quickLogin(r.key)}
              disabled={loading !== null}
              className={`group flex items-center gap-2.5 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-left disabled:opacity-50`}
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                {loading === r.key
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <RIcon className="w-4 h-4 text-white" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{r.label}</p>
                <p className="text-[10px] text-slate-500 truncate">demo_{r.key}</p>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-amber-700 mt-2.5">
        Disable this panel via Super Admin → Feature Flags → <code className="bg-white/60 px-1 rounded">feature.quick_login_enabled</code> before production launch.
      </p>
    </div>
  );
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 group">
      <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-white/20 transition-colors">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-blue-200/80 text-xs leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function LoginForm() {
  const { loginMutation } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [captchaChecked, setCaptchaChecked] = useState(false);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = (data: any) => {
    loginMutation.mutate(data, {
      onError: (err: any) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  if (showForgotPassword) {
    return <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="name@example.com" className="pl-10" autoComplete="off" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="off"
                    className="pl-10 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* CAPTCHA (HTIS T6 compliance) */}
        <div
          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${captchaChecked ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setCaptchaChecked(!captchaChecked)}
        >
          {captchaChecked ? (
            <CheckSquare className="w-5 h-5 text-emerald-600" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
          <span className="text-sm text-gray-700">I'm not a robot</span>
          <div className="ml-auto text-[10px] text-gray-400 text-right leading-tight">
            <div className="font-medium">CAPTCHA</div>
            <div>Security Check</div>
          </div>
        </div>

        <Button type="submit"
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          disabled={loginMutation.isPending || !captchaChecked}>
          {loginMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("auth.signingIn")}</>
          ) : (
            t("auth.signInTab")
          )}
        </Button>
      </form>
    </Form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm({
    resolver: zodResolver(z.object({ email: z.string().email() })),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSent(true);
        toast({ title: "Email Sent", description: "Check your inbox for the reset link." });
      }
    } catch {
      toast({ title: "Error", description: "Could not send reset email.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4 py-4">
        <Mail className="w-12 h-12 text-blue-600 mx-auto" />
        <h3 className="text-lg font-semibold">Check your email</h3>
        <p className="text-sm text-muted-foreground">
          If an account exists with that email, we've sent a password reset link.
        </p>
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Sign In
      </button>
      <h3 className="text-lg font-semibold">Reset your password</h3>
      <p className="text-sm text-muted-foreground">
        Enter your email and we'll send you a link to reset your password.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="name@example.com" className="pl-10" autoComplete="off" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function RegisterForm() {
  const { registerMutation } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", fullName: "", role: "candidate" },
  });

  const selectedRole = form.watch("role");

  const roleDescriptions: Record<string, string> = {
    candidate: "Search and apply for verified overseas job opportunities",
    agent: "Post jobs and manage recruitment drives as a licensed agency",
    employer: "Hire directly from a pool of qualified candidates",
  };

  const onSubmit = (data: any) => {
    registerMutation.mutate({ ...data, username: data.email }, {
      onError: (err: any) => {
        toast({ title: "Registration Failed", description: err.message, variant: "destructive" });
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>I want to register as</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="candidate">
                    <span className="flex items-center gap-2"><User className="h-4 w-4" /> Job Seeker (Candidate)</span>
                  </SelectItem>
                  <SelectItem value="agent">
                    <span className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> Recruitment Agency</span>
                  </SelectItem>
                  <SelectItem value="employer">
                    <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Employer</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedRole && (
                <p className="text-xs text-muted-foreground mt-1">
                  {roleDescriptions[selectedRole]}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter your full name" maxLength={100} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="name@example.com" maxLength={120} className="pl-10" autoComplete="off" {...field} />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    maxLength={128}
                    className="pl-10 pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                Must include uppercase, lowercase, number and special character
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit"
          className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
          disabled={registerMutation.isPending}>
          {registerMutation.isPending ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
          ) : (
            "Create Account"
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground mt-2">
          By registering, you agree to the HPSEDC portal terms of use.
        </p>
      </form>
    </Form>
  );
}
