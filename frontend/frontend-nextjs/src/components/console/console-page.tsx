"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/contexts/TranslationContext";
import { isAuthenticated, getUser } from "@/lib/auth";
import { getUserState, getUserTier, UserState } from "@/lib/user-state";
import { apiRequest } from "@/lib/api";

/**
 * Console Message interface
 */
interface ConsoleMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: string;
  reasoning?: any;
}

/**
 * Console Context interface
 */
interface ConsoleContext {
  tier: string;
  credits: number;
  creditLimit: number;
  workflows: Array<{
    id: string;
    name: string;
    status: string;
    lastRun: string;
  }>;
  executions: Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    status: string;
    timestamp: string;
  }>;
  features: Record<string, boolean>;
}

/**
 * Console Page Component
 * Provides AI blueprint management interface and console controls
 */
export function ConsolePage() {
  const { language } = useTranslation();
  const t = getConsoleTranslations(language);
  
  const [userState, setUserState] = useState<UserState | null>(null);
  const [context, setContext] = useState<ConsoleContext | null>(null);
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthenticatedUser, setIsAuthenticatedUser] = useState(false);
  const [currentMode, setCurrentMode] = useState<"chat" | "workflow">("chat");

  // Initialize auth state and user state
  useEffect(() => {
    const initAuth = () => {
      const authenticated = isAuthenticated();
      setIsAuthenticatedUser(authenticated);
      
      if (authenticated) {
        const user = getUser();
        const state = getUserState();
        setUserState(state);
      }
    };

    initAuth();

    // Listen for AuthManager events
    if (typeof window !== "undefined") {
      window.addEventListener("authManager:login", initAuth);
      window.addEventListener("authManager:logout", initAuth);
      window.addEventListener("userState:update", initAuth);

      return () => {
        window.removeEventListener("authManager:login", initAuth);
        window.removeEventListener("authManager:logout", initAuth);
        window.removeEventListener("userState:update", initAuth);
      };
    }
  }, []);

  // Load console context on mount
  useEffect(() => {
    if (isAuthenticatedUser) {
      loadConsoleContext();
    }
  }, [isAuthenticatedUser]);

  // Load console context from API
  async function loadConsoleContext() {
    try {
      const tier = getUserTier();
      const user = getUser();
      const userId = user?.user_id || "demo_user";
      
      const response = await apiRequest("backend", `/api/console/context?tier=${tier}&user_id=${userId}`);
      setContext(response.data as ConsoleContext);
    } catch (error) {
      console.error("Failed to load console context:", error);
    }
  }

  // Handle login click
  const handleLogin = () => {
    if (!isAuthenticatedUser) {
      // Dispatch event to open login modal
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('openLoginModal'));
      }
    }
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !isAuthenticatedUser) {
      if (!isAuthenticatedUser) {
        // Dispatch event to open login modal
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('openLoginModal'));
        }
        return;
      }
      return;
    }

    const userMessage: ConsoleMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsProcessing(true);

    try {
      const tier = getUserTier();
      const user = getUser();
      const userId = user?.user_id || "demo_user";
      
      const response = await apiRequest("backend", "/api/console/message", {
        method: "POST",
        body: JSON.stringify({
          message: inputMessage,
          files: [],
          workflow: null,
          context: {
            tier,
            user_id: userId,
            has_snapshot: userState?.user?.tier === "snapshot" || userState?.user?.tier === "blueprint" || userState?.user?.tier === "enterprise",
            has_blueprint: userState?.user?.tier === "blueprint" || userState?.user?.tier === "enterprise",
          },
        }),
      });

      const aiMessage: ConsoleMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: (response.data as any).response as string,
        timestamp: (response.data as any).timestamp as string,
        reasoning: (response.data as any).reasoning as string,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
      const errorMessage: ConsoleMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: t.errorMessage || "Failed to process your message. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle workflow generation
  const handleGenerateWorkflow = async (prompt: string) => {
    if (!prompt.trim() || !isAuthenticatedUser) {
      if (!isAuthenticatedUser) {
        // Dispatch event to open login modal
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('openLoginModal'));
        }
        return;
      }
      return;
    }

    setIsProcessing(true);

    try {
      const tier = getUserTier();
      
      const response = await apiRequest("backend", "/api/console/workflow/generate", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          tier,
        }),
      });

      // Handle workflow generation response
      console.log("Workflow generated:", response.data);
      // TODO: Implement workflow preview and editing
    } catch (error) {
      console.error("Failed to generate workflow:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      {/* Console Header */}
      <header className="border-b border-border-default bg-bg-secondary">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="text-brand-mint text-2xl font-bold">
                Aivory
              </div>
              <nav className="hidden md:flex items-center gap-6">
                <a href="/" className="text-text-secondary hover:text-text-primary transition-colors">
                  {t.nav.home}
                </a>
                <a href="http://localhost:9001" className="text-text-primary font-semibold">
                  {t.nav.dashboard}
                </a>
                <a href="/console" className="text-brand-mint font-semibold">
                  {t.nav.console}
                </a>
              </nav>
            </div>

            {/* User Info and Actions */}
            <div className="flex items-center gap-4">
              {/* Language Toggle */}
              <button
                onClick={() => {
                  const newLang = language === "en" ? "id" : "en";
                  // Update language in translation context
                  // This would require accessing the context setter
                  // For now, we'll just log it
                  console.log("Language toggle:", newLang);
                }}
                className="px-3 py-1 rounded-md bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors text-sm"
              >
                {language === "en" ? "ID" : "EN"}
              </button>

              {/* User Info */}
              {isAuthenticatedUser && userState ? (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-medium text-text-primary">
                      {userState.user?.email?.split("@")[0] || "User"}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {userState.user?.tier} Tier
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-brand-purple flex items-center justify-center text-white font-semibold">
                    {userState.user?.email?.charAt(0).toUpperCase() || "U"}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="px-4 py-2 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all"
                >
                  {t.nav.signIn}
                </button>
              )}
            </div>
          </div>

          {/* Mode Navigation */}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => setCurrentMode("chat")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentMode === "chat"
                  ? "bg-brand-mint text-bg-primary shadow-glow"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              {t.modes.chat}
            </button>
            <button
              onClick={() => setCurrentMode("workflow")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentMode === "workflow"
                  ? "bg-brand-mint text-bg-primary shadow-glow"
                  : "bg-bg-tertiary text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              {t.modes.workflow}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {currentMode === "chat" ? (
          <ChatMode
            t={t}
            messages={messages}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            isProcessing={isProcessing}
            onSendMessage={handleSendMessage}
            isAuthenticatedUser={isAuthenticatedUser}
          />
        ) : (
          <WorkflowMode
            t={t}
            isProcessing={isProcessing}
            onGenerateWorkflow={handleGenerateWorkflow}
            isAuthenticatedUser={isAuthenticatedUser}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default bg-bg-secondary py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-text-secondary text-sm">
              {t.footer.copyright.replace("{year}", new Date().getFullYear().toString())}
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <a href="/privacy" className="hover:text-text-primary transition-colors">
                {t.footer.legal.privacyPolicy}
              </a>
              <a href="/terms" className="hover:text-text-primary transition-colors">
                {t.footer.legal.termsOfService}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Chat Mode Component
 */
function ChatMode({
  t,
  messages,
  inputMessage,
  setInputMessage,
  isProcessing,
  onSendMessage,
  isAuthenticatedUser,
}: {
  t: any;
  messages: ConsoleMessage[];
  inputMessage: string;
  setInputMessage: (value: string) => void;
  isProcessing: boolean;
  onSendMessage: () => void;
  isAuthenticatedUser: boolean;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-2xl font-semibold mb-2">{t.chat.emptyTitle}</h2>
            <p className="text-center max-w-md">
              {t.chat.emptyDescription}
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-3xl p-4 rounded-lg ${
                  message.role === "user"
                    ? "bg-brand-mint text-bg-primary"
                    : "bg-bg-tertiary text-text-primary"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-semibold">
                    {message.role === "user" ? t.chat.you : "Aivory AI"}
                  </span>
                  <span className="text-xs opacity-70">
                    {new Date(message.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          placeholder={t.chat.inputPlaceholder}
          disabled={isProcessing || !isAuthenticatedUser}
          className="flex-1 px-4 py-3 rounded-lg bg-bg-secondary border border-border-default text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-mint disabled:opacity-50"
        />
        <button
          onClick={onSendMessage}
          disabled={isProcessing || !inputMessage.trim() || !isAuthenticatedUser}
          className="px-6 py-3 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? "..." : t.chat.send}
        </button>
      </div>
    </div>
  );
}

/**
 * Workflow Mode Component
 */
function WorkflowMode({
  t,
  isProcessing,
  onGenerateWorkflow,
  isAuthenticatedUser,
}: {
  t: any;
  isProcessing: boolean;
  onGenerateWorkflow: (prompt: string) => void;
  isAuthenticatedUser: boolean;
}) {
  const [workflowPrompt, setWorkflowPrompt] = useState("");

  const handleGenerate = () => {
    if (workflowPrompt.trim()) {
      onGenerateWorkflow(workflowPrompt);
      setWorkflowPrompt("");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">{t.workflow.title}</h2>
        <p className="text-text-secondary">{t.workflow.description}</p>
      </div>

      <div className="bg-bg-secondary rounded-lg p-6 border border-border-default">
        <textarea
          value={workflowPrompt}
          onChange={(e) => setWorkflowPrompt(e.target.value)}
          placeholder={t.workflow.inputPlaceholder}
          disabled={isProcessing || !isAuthenticatedUser}
          className="w-full h-32 px-4 py-3 rounded-lg bg-bg-primary border border-border-default text-text-primary placeholder-text-secondary focus:outline-none focus:border-brand-mint disabled:opacity-50 resize-none"
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isProcessing || !workflowPrompt.trim() || !isAuthenticatedUser}
            className="px-6 py-2 rounded-lg bg-brand-mint text-bg-primary font-semibold hover:bg-brand-mint-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Generating..." : t.workflow.generate}
          </button>
        </div>
      </div>

      {/* Workflow Preview Area */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">{t.workflow.recentWorkflows}</h3>
        <div className="bg-bg-secondary rounded-lg border border-border-default overflow-hidden">
          {isAuthenticatedUser ? (
            <div className="p-4 text-center text-text-secondary">
              {t.workflow.noWorkflows}
            </div>
          ) : (
            <div className="p-4 text-center text-text-secondary">
              {t.workflow.loginToAccess}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Get console translations for a specific language
 */
function getConsoleTranslations(language: "en" | "id"): any {
  const baseTranslations = {
    nav: {
      home: "Home",
      dashboard: "Dashboard",
      console: "Console",
      signIn: "Sign In",
    },
    footer: {
      copyright: "© {year} Aivory. All rights reserved.",
      legal: {
        privacyPolicy: "Privacy Policy",
        termsOfService: "Terms of Service",
      },
    },
    modes: {
      chat: "Chat",
      workflow: "Workflow",
    },
    chat: {
      emptyTitle: "Start a Conversation",
      emptyDescription: "Ask Aivory AI anything about your AI strategy, architecture, or implementation.",
      inputPlaceholder: "Type your message...",
      send: "Send",
      you: "You",
      errorMessage: "Failed to process your message. Please try again.",
    },
    workflow: {
      title: "AI Workflow Generator",
      description: "Create AI workflows from natural language descriptions",
      inputPlaceholder: "Describe the workflow you want to create...",
      generate: "Generate Workflow",
      recentWorkflows: "Recent Workflows",
      noWorkflows: "No workflows yet. Generate your first workflow above.",
      loginToAccess: "Please log in to access your workflows.",
    },
  };

  if (language === "id") {
    return {
      ...baseTranslations,
      nav: {
        ...baseTranslations.nav,
        home: "Beranda",
        dashboard: "Dashboard",
        console: "Console",
        signIn: "Masuk",
      },
      footer: {
        ...baseTranslations.footer,
        copyright: "© {year} Aivory. Hak cipta dilindungi.",
        legal: {
          ...baseTranslations.footer.legal,
          privacyPolicy: "Kebijakan Privasi",
          termsOfService: "Syarat Layanan",
        },
      },
      chat: {
        ...baseTranslations.chat,
        emptyTitle: "Mulai Percakapan",
        emptyDescription: "Tanyakan apa saja tentang strategi AI, arsitektur, atau implementasi Anda ke Aivory AI.",
        inputPlaceholder: "Ketik pesan Anda...",
        send: "Kirim",
        you: "Anda",
        errorMessage: "Gagal memproses pesan Anda. Silakan coba lagi.",
      },
      workflow: {
        ...baseTranslations.workflow,
        title: "Pembuat Alur Kerja AI",
        description: "Buat alur kerja AI dari deskripsi bahasa alami",
        inputPlaceholder: "Jelaskan alur kerja yang ingin Anda buat...",
        generate: "Buat Alur Kerja",
        recentWorkflows: "Alur Kerja Terbaru",
        noWorkflows: "Belum ada alur kerja. Buat alur kerja pertama Anda di atas.",
        loginToAccess: "Silakan masuk untuk mengakses alur kerja Anda.",
      },
    };
  }

  return baseTranslations;
}
