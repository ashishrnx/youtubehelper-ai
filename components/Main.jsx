"use client";

import React, { useState, useCallback } from "react";
import {
  FileText,
  Clipboard,
  X,
  Copy,
  Download,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import parse from "html-react-parser";
import ChatWidget from "./Chatbot";

const jsPDF = () => import("jspdf").then((module) => module.jsPDF);
const saveAs = () => import("file-saver").then((module) => module.saveAs);

const SearchContent = () => {
  const [inputValue, setInputValue] = useState("");
  const [fetchedData, setFetchedData] = useState("");
  const [fetchedQuestions, setFetchedQuestions] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("summary");
  const [displayContent, setDisplayContent] = useState(null);
  const [showButtons, setShowButtons] = useState(false);
  const [error, setError] = useState(null); // Add error state
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [downloadType, setDownloadType] = useState("");
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSummarizeClick = useCallback(async () => {
    if (!inputValue) {
      setError("Please enter a YouTube URL");
      return;
    }

    setIsLoading(true);
    setDisplayContent(null);
    setFetchedData("");
    setError(null);

    try {
      // Create the summary URL
      const summaryUrl = `/summary/?code=${encodeURIComponent(
        inputValue
      )}&count=300`;

      // Make the request to our proxy
      const response = await fetch(
        `/api/proxy?url=${encodeURIComponent(summaryUrl)}`
      );

      // Debug log
      // console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.message) {
        setFetchedData(data.message);
        setShowButtons(true);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      setError(error.message || "Failed to load summary. Please try again.");
      setFetchedData("");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue]);

  const handleQuestionsClick = useCallback(async () => {
    if (!inputValue) {
      setError("Please enter a YouTube URL");
      return;
    }

    setIsLoading(true);
    setDisplayContent(null);
    setFetchedQuestions("");
    setError(null);

    try {
      // Create the questions URL
      const questionsUrl = `/question/?code=${encodeURIComponent(
        inputValue
      )}&q=10`;

      // Make the request to our proxy
      const response = await fetch(
        `/api/proxy?url=${encodeURIComponent(questionsUrl)}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data = await response.json();

      if (data.message) {
        setFetchedQuestions(data.message);
        setShowButtons(true);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError(error.message || "Failed to load questions. Please try again.");
      setFetchedQuestions("");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue]);

  React.useEffect(() => {
    if (isLoading) {
      setDisplayContent(
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
      );
    } else {
      switch (activeTab) {
        case "summary":
          setDisplayContent(
            error ? (
              <p className="text-rose-400">{error}</p>
            ) : (
              formatOutput(fetchedData) || (
                <p>Paste a YouTube URL and click 'Summarize' to get started.</p>
              )
            )
          );
          break;
        case "qa":
          setDisplayContent(
            error ? (
              <p className="text-rose-400">{error}</p>
            ) : (
              formatOutput(fetchedQuestions) || (
                <p>
                  Paste a YouTube URL and click 'Q&A' to generate questions.
                </p>
              )
            )
          );
          break;
        default:
          setDisplayContent(null);
      }
    }
  }, [activeTab, fetchedData, fetchedQuestions, isLoading, error]);
  const formatOutput = (content) => {
    if (!content) return null;

    return parse(content, {
      replace: (domNode, i) => {
        if (domNode.type === "tag") {
          const children = domNode.children?.map((child) =>
            typeof child === "object" ? child.data || null : child
          );

          // Use `i` (index) to ensure keys are unique
          switch (domNode.name) {
            case "h1":
              return (
                <h1
                  key={`${i}-${domNode.startIndex || ""}`}
                  className="text-2xl font-bold mb-4"
                >
                  {children}
                </h1>
              );
            case "h2":
              return (
                <h2
                  key={`${i}-${domNode.startIndex || ""}`}
                  className="text-xl font-semibold mb-3"
                >
                  {children}
                </h2>
              );
            case "p":
              return (
                <p key={`${i}-${domNode.startIndex || ""}`} className="mb-2">
                  {children}
                </p>
              );
            case "a":
              return (
                <a
                  key={`${i}-${domNode.startIndex || ""}`}
                  href={domNode.attribs.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
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
  const handlePasteClick = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInputValue(text);
      setError(null); // Clear any existing errors
    } catch (err) {
      console.error("Failed to read clipboard contents: ", err);
      setError("Failed to paste from clipboard. Please try again.");
    }
  }, []);
  const copyToClipboard = useCallback(() => {
    const content = document.querySelector(".output-content").innerText;
    navigator.clipboard
      .writeText(content)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        setError("Failed to copy to clipboard. Please try again.");
      });
  }, []);

  const handleDownload = useCallback((type) => {
    setDownloadType(type);
    setShowDownloadModal(true);
    setShowDownloadOptions(false);
  }, []);

  const performDownload = useCallback(async () => {
    const content = document.querySelector(".output-content").innerText;
    try {
      if (downloadType === "pdf") {
        const { jsPDF } = await jsPDF();
        const pdf = new jsPDF();
        pdf.text(content, 10, 10);
        pdf.save(`${fileName || "output"}.pdf`);
      } else if (downloadType === "docx") {
        const { saveAs } = await saveAs();
        const blob = new Blob([content], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });
        saveAs(blob, `${fileName || "output"}.docx`);
      }
    } catch (error) {
      console.error("Error during download:", error);
      // You might want to set an error state here to display to the user
    }
    setShowDownloadModal(false);
    setFileName("");
  }, [fileName, downloadType]);

  return (
    <section className="w-full min-h-screen bg-black text-rose-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-6 text-rose-100 drop-shadow-lg">
          Unlocking Knowledge Through Videos
        </h1>
        <p className="text-xl text-center mb-8 text-rose-200">
          Enter the YouTube Video Url below
        </p>
        <div className="flex flex-col items-center space-y-4">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="Paste YouTube URL"
              className="w-full pr-10 bg-rose-950/50 text-rose-100 placeholder-rose-400 border border-rose-800 rounded-lg py-2 px-4 focus:outline-none focus:border-rose-700 focus:ring focus:ring-rose-700/50"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setError(null); // Clear error when input changes
              }}
            />
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-rose-400 hover:text-rose-200 hover:bg-rose-900/50 rounded-full p-1"
              onClick={() => {
                if (inputValue) {
                  setInputValue("");
                  setError(null); // Clear error when clearing input
                } else {
                  handlePasteClick();
                }
              }}
            >
              {inputValue ? <X size={20} /> : <Clipboard size={20} />}
            </button>
          </div>
          {error && (
            <div className="w-full max-w-md p-3 bg-rose-900/50 border border-rose-700 rounded-lg text-rose-100">
              {error}
            </div>
          )}
          <button
            onClick={handleSummarizeClick}
            disabled={isLoading}
            className={`w-full max-w-md bg-rose-900 hover:bg-rose-800 text-rose-100 font-semibold py-2 rounded-lg flex items-center justify-center space-x-2 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <FileText size={20} />
            <span>{isLoading ? "Processing..." : "Summarize"}</span>
          </button>
        </div>
        <div className="mt-12">
          <div className="flex w-full justify-between bg-rose-950/50 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("summary")}
              className={`w-full text-center py-2 rounded-md ${
                activeTab === "summary"
                  ? "bg-rose-900 text-rose-100"
                  : "text-rose-400 hover:text-rose-200"
              }`}
            >
              Summary
            </button>
            <button
              onClick={handleQuestionsClick}
              className={`w-full text-center py-2 rounded-md ${
                activeTab === "qa"
                  ? "bg-rose-900 text-rose-100"
                  : "text-rose-400 hover:text-rose-200"
              }`}
            >
              Q&A
            </button>
          </div>
          <div className="mt-4 bg-rose-950/30 border border-rose-800 backdrop-blur-sm p-6 rounded-lg relative">
            <div className="output-content">
              <AnimatedContent content={displayContent} />
            </div>
            {showButtons && (
              <div className="absolute top-2 right-2 flex space-x-2">
                <button
                  onClick={copyToClipboard}
                  className="p-2 bg-rose-900 rounded-full shadow-md hover:bg-rose-800 transition-colors duration-200"
                  title="Copy to clipboard"
                >
                  {isCopied ? (
                    <span className="text-white font-medium">Copied!</span>
                  ) : (
                    <Copy
                      size={20}
                      className="text-rose-600 dark:text-rose-300"
                    />
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                    className="p-2 bg-rose-900 rounded-full shadow-md hover:bg-rose-800 transition-colors duration-200 flex items-center"
                    title="Download options"
                  >
                    <Download
                      size={20}
                      className="text-rose-600 dark:text-rose-300"
                    />
                  </button>
                  {showDownloadOptions && (
                    <div className="absolute right-0 mt-2 w-36 bg-rose-950 rounded-md shadow-lg z-10">
                      <button
                        onClick={() => handleDownload("pdf")}
                        className="block w-full text-left px-4 py-2 text-sm text-rose-200 hover:bg-rose-900"
                      >
                        Download as PDF
                      </button>
                      <button
                        onClick={() => handleDownload("docx")}
                        className="block w-full text-left px-4 py-2 text-sm text-rose-200 hover:bg-rose-900"
                      >
                        Download as DOCX
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-rose-950 p-6 rounded-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Enter file name</h2>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter file name"
              className="w-full px-3 py-2 bg-rose-900 border border-rose-800 text-rose-100 rounded-md mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDownloadModal(false)}
              >
                Cancel
              </button>
              <button
                onClick={performDownload}
                className="px-4 py-2 bg-rose-800 text-rose-100 rounded-md hover:bg-rose-700"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
      <ChatWidget />
    </section>
  );
};

const AnimatedContent = ({ content }) => {
  const contentArray = React.Children.toArray(content);

  return (
    <motion.div className="space-y-2">
      <AnimatePresence>
        {contentArray.map((child, index) => (
          <motion.div
            key={`content-${index}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="text-rose-100 overflow-hidden"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
            >
              {child}
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchContent;
