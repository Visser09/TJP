import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Upload, FileCheck, Download, CheckCircle, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CsvPreview {
  headers: string[];
  previewRows: any[];
  totalRows: number;
  detectedFormat?: {
    source: string;
    mapping: any;
  };
  filename: string;
}

interface MappingSpec {
  symbol: string;
  side: string;
  qty: string;
  entryPrice: string;
  exitPrice?: string;
  entryTime: string;
  exitTime?: string;
  fees?: string;
  pnl?: string;
  brokerExecutionId?: string;
}

interface ImportCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportCsvModal({ isOpen, onClose }: ImportCsvModalProps) {
  const [step, setStep] = useState(1);
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState<"eval" | "pa" | "live">("eval");
  const [newAccountFirm, setNewAccountFirm] = useState<"apex" | "topstep" | "takeprofit">("apex");
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [mapping, setMapping] = useState<MappingSpec>({
    symbol: "",
    side: "",
    qty: "",
    entryPrice: "",
    entryTime: ""
  });
  const [saveMapping, setSaveMapping] = useState(false);
  const [mappingName, setMappingName] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [importComplete, setImportComplete] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch trading accounts
  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/trading-accounts"],
    enabled: isOpen
  });

  // Fetch saved mapping profiles
  const { data: mappingProfiles = [] } = useQuery({
    queryKey: ["/api/import/mappings"],
    enabled: isOpen
  });

  // Preview CSV mutation
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return apiRequest('/api/import/csv/preview', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (data: CsvPreview) => {
      setCsvPreview(data);
      if (data.detectedFormat) {
        setSelectedSource(data.detectedFormat.source);
        setMapping(data.detectedFormat.mapping);
      }
      setStep(3);
    },
    onError: (error) => {
      toast({
        title: "CSV Preview Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Import CSV mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!csvPreview || !fileInputRef.current?.files?.[0]) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append('file', fileInputRef.current.files[0]);
      formData.append('accountId', selectedAccount);
      formData.append('source', selectedSource);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('saveMapping', saveMapping.toString());
      if (saveMapping && mappingName) {
        formData.append('mappingName', mappingName);
      }

      return apiRequest('/api/import/csv', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: (result) => {
      setImportResult(result);
      setImportComplete(true);
      setImportProgress(100);
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ai-insights"] });
      
      toast({
        title: "Import Successful",
        description: `${result.inserted} trades imported, ${result.updated} updated`,
        variant: "default"
      });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Create new account mutation
  const createAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/trading-accounts', {
        method: 'POST',
        body: JSON.stringify({
          nickname: newAccountName,
          propFirm: newAccountFirm,
          accountType: newAccountType,
          provider: 'csv'
        })
      });
    },
    onSuccess: (account) => {
      setSelectedAccount(account.id);
      queryClient.invalidateQueries({ queryKey: ["/api/trading-accounts"] });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.csv')) {
      previewMutation.mutate(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a CSV file",
        variant: "destructive"
      });
    }
  };

  const handleImport = () => {
    setImportProgress(10);
    importMutation.mutate();
  };

  const resetModal = () => {
    setStep(1);
    setSelectedSource("");
    setSelectedAccount("");
    setNewAccountName("");
    setCsvPreview(null);
    setMapping({
      symbol: "",
      side: "",
      qty: "",
      entryPrice: "",
      entryTime: ""
    });
    setSaveMapping(false);
    setMappingName("");
    setImportProgress(0);
    setImportComplete(false);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6" data-testid="step-source-selection">
            <div>
              <Label className="text-base font-medium">Select Data Source</Label>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <Card 
                  className={`cursor-pointer transition-colors ${selectedSource === 'apex' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedSource('apex')}
                  data-testid="source-apex"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Apex Trader Funding</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">Auto-detects Apex CSV format</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-colors ${selectedSource === 'topstep' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedSource('topstep')}
                  data-testid="source-topstep"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">TopStep</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">Auto-detects TopStep CSV format</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-colors ${selectedSource === 'tpt' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedSource('tpt')}
                  data-testid="source-tpt"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Take Profit Trader</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">Auto-detects TPT CSV format</p>
                  </CardContent>
                </Card>
                
                <Card 
                  className={`cursor-pointer transition-colors ${selectedSource === 'custom' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setSelectedSource('custom')}
                  data-testid="source-custom"
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Custom CSV</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground">Map columns manually</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)} 
                disabled={!selectedSource}
                data-testid="button-next-account"
              >
                Next: Select Account
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6" data-testid="step-account-selection">
            <div>
              <Label className="text-base font-medium">Choose Trading Account</Label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="mt-3" data-testid="select-account">
                  <SelectValue placeholder="Select existing account or create new" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id} data-testid={`account-${account.id}`}>
                      {account.nickname} ({account.propFirm?.toUpperCase()}-{account.accountType?.toUpperCase()})
                    </SelectItem>
                  ))}
                  <SelectItem value="new" data-testid="account-new">Create New Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedAccount === "new" && (
              <Card data-testid="new-account-form">
                <CardHeader>
                  <CardTitle className="text-sm">Create New Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="account-name">Account Name</Label>
                    <Input 
                      id="account-name"
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="e.g., APEX-Eval-1"
                      data-testid="input-new-account-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Prop Firm</Label>
                      <Select value={newAccountFirm} onValueChange={(value: any) => setNewAccountFirm(value)}>
                        <SelectTrigger data-testid="select-prop-firm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apex">Apex Trader Funding</SelectItem>
                          <SelectItem value="topstep">TopStep</SelectItem>
                          <SelectItem value="takeprofit">Take Profit Trader</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Account Type</Label>
                      <Select value={newAccountType} onValueChange={(value: any) => setNewAccountType(value)}>
                        <SelectTrigger data-testid="select-account-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eval">Evaluation</SelectItem>
                          <SelectItem value="pa">PA (Funded)</SelectItem>
                          <SelectItem value="live">Live</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={() => createAccountMutation.mutate()}
                    disabled={!newAccountName || createAccountMutation.isPending}
                    data-testid="button-create-account"
                  >
                    Create Account
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back-source">
                Back
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={!selectedAccount || (selectedAccount === "new" && !newAccountName)}
                data-testid="button-next-upload"
              >
                Next: Upload File
              </Button>
            </div>
          </div>
        );

      case 3:
        if (!csvPreview) {
          return (
            <div className="space-y-6" data-testid="step-file-upload">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Label className="text-base font-medium">Upload CSV File</Label>
                <p className="text-sm text-muted-foreground mt-2">
                  Drop your {selectedSource.toUpperCase()} trading statement here
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  data-testid="input-file-upload"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={previewMutation.isPending}
                  data-testid="button-select-file"
                >
                  {previewMutation.isPending ? "Processing..." : "Select CSV File"}
                </Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back-account">
                  Back
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6" data-testid="step-preview-mapping">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">CSV Preview</h3>
                <p className="text-sm text-muted-foreground">
                  {csvPreview.filename} • {csvPreview.totalRows} rows
                </p>
              </div>
              {csvPreview.detectedFormat && (
                <Badge variant="secondary">
                  {csvPreview.detectedFormat.source.toUpperCase()} Detected
                </Badge>
              )}
            </div>

            <div className="border rounded-lg p-4 max-h-60 overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {csvPreview.headers.map((header, idx) => (
                      <th key={idx} className="text-left p-1 font-medium">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.previewRows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="border-b">
                      {csvPreview.headers.map((header, cellIdx) => (
                        <td key={cellIdx} className="p-1">{row[header]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!csvPreview.detectedFormat && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Map Columns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Symbol *</Label>
                      <Select value={mapping.symbol} onValueChange={(value) => setMapping({...mapping, symbol: value})}>
                        <SelectTrigger data-testid="select-mapping-symbol">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvPreview.headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Side *</Label>
                      <Select value={mapping.side} onValueChange={(value) => setMapping({...mapping, side: value})}>
                        <SelectTrigger data-testid="select-mapping-side">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvPreview.headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Quantity *</Label>
                      <Select value={mapping.qty} onValueChange={(value) => setMapping({...mapping, qty: value})}>
                        <SelectTrigger data-testid="select-mapping-qty">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvPreview.headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Entry Price *</Label>
                      <Select value={mapping.entryPrice} onValueChange={(value) => setMapping({...mapping, entryPrice: value})}>
                        <SelectTrigger data-testid="select-mapping-entry-price">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvPreview.headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Entry Time *</Label>
                      <Select value={mapping.entryTime} onValueChange={(value) => setMapping({...mapping, entryTime: value})}>
                        <SelectTrigger data-testid="select-mapping-entry-time">
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {csvPreview.headers.map((header) => (
                            <SelectItem key={header} value={header}>{header}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={saveMapping} 
                      onCheckedChange={setSaveMapping}
                      data-testid="switch-save-mapping"
                    />
                    <Label>Save this mapping for future imports</Label>
                  </div>
                  
                  {saveMapping && (
                    <Input
                      placeholder="Mapping name (e.g., My Custom Broker)"
                      value={mappingName}
                      onChange={(e) => setMappingName(e.target.value)}
                      data-testid="input-mapping-name"
                    />
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => {setCsvPreview(null); setStep(3);}} data-testid="button-back-upload">
                Change File
              </Button>
              <Button 
                onClick={() => setStep(4)}
                disabled={!mapping.symbol || !mapping.side || !mapping.qty || !mapping.entryPrice || !mapping.entryTime}
                data-testid="button-next-import"
              >
                Next: Import
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6" data-testid="step-import-progress">
            {!importComplete ? (
              <>
                <div className="text-center">
                  <FileCheck className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                  <h3 className="font-medium">Ready to Import</h3>
                  <p className="text-sm text-muted-foreground">
                    {csvPreview?.totalRows} rows will be imported to your account
                  </p>
                </div>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="font-medium">{selectedSource.toUpperCase()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Account:</span>
                        <span className="font-medium">
                          {accounts.find((a: any) => a.id === selectedAccount)?.nickname}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>File:</span>
                        <span className="font-medium">{csvPreview?.filename}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rows:</span>
                        <span className="font-medium">{csvPreview?.totalRows}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {importProgress > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Importing...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <Progress value={importProgress} data-testid="progress-import" />
                  </div>
                )}

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(3)} disabled={importMutation.isPending} data-testid="button-back-preview">
                    Back
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    data-testid="button-start-import"
                  >
                    {importMutation.isPending ? "Importing..." : "Start Import"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4" data-testid="import-success">
                <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                <div>
                  <h3 className="font-medium text-lg">Import Complete!</h3>
                  <p className="text-muted-foreground">
                    Your trades have been successfully imported
                  </p>
                </div>

                {importResult && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">{importResult.inserted}</div>
                          <div className="text-sm text-muted-foreground">New Trades</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                          <div className="text-sm text-muted-foreground">Updated</div>
                        </div>
                      </div>
                      {importResult.errors?.length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-center space-x-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              {importResult.errors.length} warnings
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-center space-x-4">
                  <Button variant="outline" onClick={handleClose} data-testid="button-close">
                    Close
                  </Button>
                  <Button onClick={() => {resetModal(); setStep(1);}} data-testid="button-import-another">
                    Import Another File
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="import-csv-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5" />
            <span>Import CSV Trades</span>
          </DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                  data-testid={`step-indicator-${stepNum}`}
                >
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <Separator className="w-12 mx-2" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Step {step} of 4: {
              step === 1 ? "Select Source" :
              step === 2 ? "Choose Account" :
              step === 3 ? "Upload & Preview" :
              "Import"
            }
          </div>
        </div>

        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}