"use client";

import { useState, useRef, useEffect } from "react";
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Send,
  Link,
  AlertCircle,
  Youtube,
  Sparkles,
  Clipboard,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import parse from "html-react-parser";
import { callOpenAI } from "../utils/openai.js";
import { useClientOnly } from "../hooks/useClientOnly";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(true);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [transcripts, setTranscripts] = useState({});

  const chatRef = useRef(null);
  const isClient = useClientOnly();

  useEffect(() => {
    function handleClickOutside(event) {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsMinimized(false);
      }
    }

    if (isOpen && !isMinimized) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, isMinimized]);

  useEffect(() => {
    const storedTranscripts = localStorage.getItem("transcripts");
    if (storedTranscripts) {
      setTranscripts(JSON.parse(storedTranscripts));
    }

    const storedHistory = localStorage.getItem("conversationHistory");
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      setConversationHistory(parsedHistory);

      if (parsedHistory.length > 0 && parsedHistory[0].role === "system") {
        const transcriptMatch = parsedHistory[0].content.match(
          /Video Summary: (.*?)\n\n/
        );
        if (transcriptMatch) {
          const storedVideoUrl = Object.keys(
            JSON.parse(storedTranscripts)
          ).find(
            (url) => JSON.parse(storedTranscripts)[url] === transcriptMatch[1]
          );
          if (storedVideoUrl) {
            setCurrentVideoUrl(storedVideoUrl);
            setShowUrlInput(false);
          }
        }
      }
    }
  }, []);

  const formatOutput = (content) => {
    if (!content) return null;

    return parse(content, {
      replace: (domNode) => {
        if (domNode.type === "tag") {
          const children = domNode.children?.map((child) =>
            typeof child === "object" ? child.data || null : child
          );

          switch (domNode.name) {
            case "h1":
              return (
                <h1 className="text-2xl font-bold mb-4 text-rose-200">
                  {children}
                </h1>
              );
            case "h2":
              return (
                <h2 className="text-xl font-semibold mb-3 text-rose-200">
                  {children}
                </h2>
              );
            case "p":
              return <p className="mb-2 text-rose-100">{children}</p>;
            case "a":
              return (
                <a
                  href={domNode.attribs.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-rose-400 hover:underline"
                >
                  {children}
                </a>
              );
            default:
              return null;
          }
        }
      },
    });
  };

  const isValidYoutubeUrl = (url) => {
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    return youtubeRegex.test(url);
  };

  const handleVideoUrlSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentVideoUrl) {
      setError("Please enter a video URL");
      return;
    }

    if (!isValidYoutubeUrl(currentVideoUrl)) {
      setError("Please enter a valid YouTube URL");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/summary/?code=${encodeURIComponent(
          currentVideoUrl
        )}&count=300`
      );
      const data = await response.json();

      if (!data.message) {
        setError("Failed to get video summary. Please try again.");
        return;
      }

      const newTranscripts = {
        ...transcripts,
        [currentVideoUrl]: data.message,
      };
      setTranscripts(newTranscripts);
      localStorage.setItem("transcripts", JSON.stringify(newTranscripts));

      const initialMessage = {
        role: "system",
        content: `Video Summary: ${data.message}\n\nPlease answer questions based on this summary.`,
      };
      setConversationHistory([initialMessage]);
      localStorage.setItem(
        "conversationHistory",
        JSON.stringify([initialMessage])
      );

      setShowUrlInput(false);
      setMessages([
        {
          type: "bot",
          content: formatOutput(
            "<h2>Video summary loaded successfully!</h2><p>You can now ask questions about the video.</p>"
          ),
        },
      ]);
    } catch (error) {
      setError("Failed to load video summary. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentVideoUrl) return;

    const userMessage = { role: "user", content: input };
    const updatedHistory = [...conversationHistory, userMessage];
    setConversationHistory(updatedHistory);
    setMessages((prev) => [...prev, { type: "user", content: input }]);
    setInput("");
    setError("");

    try {
      const summary = transcripts[currentVideoUrl] || "";
      const context = `Video Summary: ${summary}\n\nUser Question: ${input}`;
      const assistantMessage = await callOpenAI([
        ...updatedHistory,
        { role: "system", content: context },
      ]);

      const newHistory = [...updatedHistory, assistantMessage];
      setConversationHistory(newHistory);
      localStorage.setItem("conversationHistory", JSON.stringify(newHistory));

      setMessages((prev) => [
        ...prev,
        {
          type: "bot",
          content: formatOutput(assistantMessage.content),
        },
      ]);
    } catch (error) {
      setError("Failed to get response. Please try again.");
    }
  };

  const resetChat = () => {
    setMessages([]);
    setCurrentVideoUrl("");
    setShowUrlInput(true);
    setError("");
    setConversationHistory([]);
    localStorage.removeItem("conversationHistory");
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCurrentVideoUrl(text);
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
      setError(
        "Failed to paste from clipboard. Please try manually entering the URL."
      );
    }
  };

  const MessageContent = ({ message }) => {
    return (
      <div
        className={`flex ${
          message.type === "user" ? "justify-end" : "justify-start"
        }`}
      >
        <div
          className={`max-w-[80%] rounded-lg px-4 py-2 ${
            message.type === "user"
              ? "bg-rose-800 text-rose-50"
              : "bg-gray-900 border border-rose-800 text-rose-100"
          }`}
        >
          {typeof message.content === "string"
            ? formatOutput(message.content)
            : message.content}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      {...(isClient && { "data-cz-shortcut-listen": "true" })}
    >
      <div className="relative">
        <AnimatePresence mode="wait">
          {isOpen && !isMinimized && (
            <motion.div
              ref={chatRef}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="absolute bottom-0 right-0"
            >
              <Card className="w-[320px] h-[450px] shadow-2xl bg-black backdrop-blur-md rounded-3xl border border-rose-900">
                <CardHeader className="flex flex-row items-center justify-between p-4 bg-black backdrop-blur-sm rounded-t-3xl border-b border-rose-900">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-2xl bg-rose-800 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-rose-100" />
                      </div>
                      {!showUrlInput && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-black" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-rose-100">
                        AI Assistant
                      </h3>
                      <p className="text-xs text-rose-300">
                        {showUrlInput ? "Waiting for video" : "Ready to help"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={resetChat}
                      className="h-8 w-8 rounded-xl bg-black border-rose-800 text-rose-100 hover:bg-rose-950 hover:text-rose-50"
                    >
                      <Link className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsMinimized(true)}
                      className="h-8 w-8 rounded-xl bg-black border-rose-800 text-rose-100 hover:bg-rose-950 hover:text-rose-50"
                    >
                      <Minimize2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setIsOpen(false);
                        setIsMinimized(false);
                      }}
                      className="h-8 w-8 rounded-xl bg-black border-rose-800 text-rose-100 hover:bg-rose-950 hover:text-rose-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col h-[calc(450px-4rem)]">
                  <ScrollArea className="flex-1 px-4 py-5">
                    <div className="space-y-6">
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Alert
                            variant="destructive"
                            className="rounded-2xl border border-rose-700 bg-rose-950/50"
                          >
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-rose-100">
                              {error}
                            </AlertDescription>
                          </Alert>
                        </motion.div>
                      )}
                      {showUrlInput ? (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-6"
                        >
                          <div className="text-center space-y-3 px-4">
                            <div className="h-14 w-14 rounded-3xl bg-rose-800 flex items-center justify-center mx-auto mb-3">
                              <Youtube className="h-7 w-7 text-rose-100" />
                            </div>
                            <h2 className="text-lg font-semibold text-rose-100">
                              Welcome!
                            </h2>
                            <p className="text-sm text-rose-300">
                              Share a YouTube video URL to start our
                              conversation
                            </p>
                          </div>
                          <form
                            onSubmit={handleVideoUrlSubmit}
                            className="space-y-4 px-4"
                          >
                            <div className="relative mb-2">
                              <Input
                                placeholder="Paste YouTube URL..."
                                value={currentVideoUrl}
                                onChange={(e) =>
                                  setCurrentVideoUrl(e.target.value)
                                }
                                disabled={isLoading}
                                className="pr-8 rounded-xl bg-black border-rose-800 focus:border-rose-700 text-rose-100 placeholder-rose-500"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={
                                  currentVideoUrl
                                    ? () => setCurrentVideoUrl("")
                                    : handlePaste
                                }
                                className="absolute right-1 top-0.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-rose-100"
                              >
                                {currentVideoUrl ? (
                                  <X className="h-3 w-3" />
                                ) : (
                                  <Clipboard className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex justify-center">
                              <Button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 rounded-lg bg-rose-800 hover:bg-rose-700 text-rose-100"
                              >
                                {isLoading ? "Loading..." : "Connect"}
                              </Button>
                            </div>
                          </form>
                        </motion.div>
                      ) : (
                        <AnimatePresence mode="popLayout">
                          {messages.map((message, index) => (
                            <motion.div
                              key={`message-${index}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className={`flex ${
                                message.type === "user"
                                  ? "justify-end"
                                  : "justify-start"
                              } mb-3`}
                            >
                              <div
                                className={`max-w-[85%] rounded-2xl px-4 py-2 shadow-sm ${
                                  message.type === "user"
                                    ? "bg-rose-800 text-rose-50 ml-12 rounded-br-sm"
                                    : "bg-black border border-rose-900 mr-12 rounded-bl-sm text-rose-100"
                                }`}
                              >
                                {typeof message.content === "string"
                                  ? formatOutput(message.content)
                                  : message.content}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </ScrollArea>
                  {!showUrlInput && (
                    <div className="p-3 bg-black backdrop-blur-sm border-t border-rose-900">
                      <form onSubmit={handleSubmit} className="flex gap-2">
                        <Input
                          placeholder="Ask about the video..."
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          className="flex-1 rounded-xl bg-black border-rose-800 focus:border-rose-700 text-rose-100 placeholder-rose-500"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          className="rounded-xl bg-rose-800 hover:bg-rose-700 text-rose-100"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMinimized && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <Button
                className="shadow-lg bg-rose-800 hover:bg-rose-700 text-rose-50 rounded-2xl gap-2"
                onClick={() => setIsMinimized(false)}
              >
                <Maximize2 className="h-4 w-4" />
                <span>AI Assistant</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!isOpen && !isMinimized && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className="absolute bottom-0 right-0"
          >
            <Button
              size="icon"
              className="h-10 w-10 rounded-2xl shadow-lg bg-rose-800 hover:bg-rose-700 text-rose-50 transition-all hover:rounded-xl"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
