"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, FileText, BarChart3, AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [pages, setPages] = useState<number>(3)
  const [status, setStatus] = useState<string>("")
  const [logs, setLogs] = useState<string>("")
  const [jobId, setJobId] = useState<string | null>(null)
  const [narrative, setNarrative] = useState<string>("No narrative loaded.")
  const [sankeyUrl, setSankeyUrl] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("upload")
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  const logsRef = useRef<HTMLDivElement>(null)
  const logSourceRef = useRef<EventSource | null>(null)

  const apiRoot = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    return () => {
      if (logSourceRef.current) {
        logSourceRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    // Simulate progress based on status
    if (isProcessing) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          const newProgress = prev + 1
          if (newProgress >= 95) {
            clearInterval(interval)
            return 95
          }
          return newProgress
        })
      }, 500)

      return () => clearInterval(interval)
    } else if (status === "completed") {
      setProgress(100)
    }
  }, [isProcessing, status])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError("Please select a PDF file")
      return
    }

    setError(null)
    setStatus("Uploading...")
    setLogs("")
    setIsProcessing(true)
    setProgress(5)
    setActiveTab("processing")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("pages", pages.toString())

    try {
      const response = await fetch(`${apiRoot}/api/upload_pdf`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setJobId(data.job_id)
      openLogStream(data.job_id)
      pollStatus(data.job_id)
    } catch (err: any) {
      setStatus("Error")
      setError(err.message)
      setIsProcessing(false)
    }
  }

  const openLogStream = (jobId: string) => {
    if (logSourceRef.current) {
      logSourceRef.current.close()
    }

    logSourceRef.current = new EventSource(`${apiRoot}/api/logs/${jobId}`)
    logSourceRef.current.onmessage = (e) => {
      setLogs((prev) => prev + e.data + "\n")
    }
  }

  const pollStatus = async (jobId: string) => {
    try {
      const response = await fetch(`${apiRoot}/api/status/${jobId}`)
      const data = await response.json()

      setStatus(data.status)

      if (data.status === "running") {
        setTimeout(() => pollStatus(jobId), 2000)
      } else if (data.status === "completed") {
        setIsProcessing(false)
        showResults(jobId)
        setActiveTab("results")
      } else {
        setIsProcessing(false)
      }
    } catch (err: any) {
      setStatus("Error")
      setError(`Status error: ${err.message}`)
      setIsProcessing(false)
    }
  }

  const showResults = async (jobId: string) => {
    try {
      const response = await fetch(`${apiRoot}/api/results/${jobId}`)
      const data = await response.json()

      if (data.error) {
        setError(data.error)
        return
      }

      const narrativeFile = data.narrative
      const sankeyFile = data.sankey

      // Load narrative text
      try {
        const narrativeResponse = await fetch(`${apiRoot}/api/download/${encodeURIComponent(narrativeFile)}`)
        if (!narrativeResponse.ok) {
          throw new Error(narrativeResponse.statusText)
        }
        const text = await narrativeResponse.text()
        setNarrative(text)
      } catch (err: any) {
        setNarrative(
          `Failed to load narrative: ${err.message}\n\nYou can download it directly: ${apiRoot}/api/download/${encodeURIComponent(narrativeFile)}`,
        )
      }

      // Set Sankey chart URL
      setSankeyUrl(`${apiRoot}/api/download/${encodeURIComponent(sankeyFile)}`)
    } catch (err: any) {
      setError(`Results error: ${err.message}`)
    }
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">10-K Financial Storytelling</h1>
        </div>
        <p className="text-gray-600 text-center max-w-2xl">
          Upload a 10-K PDF file to generate a narrative summary and visualize financial flows with a Sankey chart
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="upload" disabled={isProcessing}>
            Upload
          </TabsTrigger>
          <TabsTrigger value="processing">Processing</TabsTrigger>
          <TabsTrigger value="results" disabled={!narrative || narrative === "No narrative loaded."}>
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload 10-K PDF</CardTitle>
              <CardDescription>Select a 10-K PDF file to analyze and specify how many pages to process</CardDescription>
            </CardHeader>
            <CardContent>
              <form id="upload-form" onSubmit={handleSubmit}>
                <div className="grid gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="pdf-file">Select 10-K PDF file</Label>
                    <div className="flex items-center gap-4">
                      <div className="border rounded-md p-2 flex-1">
                        <Input
                          id="pdf-file"
                          type="file"
                          accept="application/pdf"
                          onChange={handleFileChange}
                          className="cursor-pointer"
                        />
                      </div>
                    </div>
                    {file && (
                      <p className="text-sm text-gray-500">
                        Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="pages">Number of pages to process</Label>
                    <Input
                      id="pages"
                      type="number"
                      min="1"
                      value={pages}
                      onChange={(e) => setPages(Number.parseInt(e.target.value) || 3)}
                      className="w-24"
                    />
                    <p className="text-sm text-gray-500">
                      Processing more pages takes longer but may provide better results
                    </p>
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter>
              <Button type="submit" onClick={handleSubmit} className="w-full sm:w-auto">
                <Upload className="mr-2 h-4 w-4" />
                Upload & Process
              </Button>
            </CardFooter>
          </Card>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                ) : status === "completed" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                Processing Status: {status}
              </CardTitle>
              <CardDescription>
                {isProcessing
                  ? "Your 10-K PDF is being analyzed. This may take a few minutes."
                  : status === "completed"
                    ? "Analysis complete! You can view the results now."
                    : "Processing status information"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="logs">Processing Logs</Label>
                <div
                  id="logs"
                  ref={logsRef}
                  className="h-[300px] overflow-auto border rounded-md p-3 bg-gray-50 font-mono text-sm whitespace-pre-wrap"
                >
                  {logs || "Waiting for logs..."}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              {status === "completed" && <Button onClick={() => setActiveTab("results")}>View Results</Button>}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <Tabs defaultValue="narrative" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="narrative">
                <FileText className="h-4 w-4 mr-2" />
                Narrative
              </TabsTrigger>
              <TabsTrigger value="sankey">
                <BarChart3 className="h-4 w-4 mr-2" />
                Sankey Chart
              </TabsTrigger>
            </TabsList>

            <TabsContent value="narrative">
              <Card>
                <CardHeader>
                  <CardTitle>Narrative Summary</CardTitle>
                  <CardDescription>AI-generated summary of the 10-K financial report</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[500px] overflow-auto border rounded-md p-4 bg-white whitespace-pre-wrap">
                    {narrative}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sankey">
              <Card>
                <CardHeader>
                  <CardTitle>Sankey Chart</CardTitle>
                  <CardDescription>Visual representation of financial flows</CardDescription>
                </CardHeader>
                <CardContent>
                  {sankeyUrl ? (
                    <div className="border rounded-md h-[500px] bg-white">
                      <iframe src={sankeyUrl} className="w-full h-full" title="Sankey Chart" />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-[500px] border rounded-md bg-gray-50">
                      <p className="text-gray-500">No Sankey chart available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </main>
  )
}
