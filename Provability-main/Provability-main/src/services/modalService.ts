/**
 * Service for triggering Modal inference jobs
 */

export interface TriggerInferenceParams {
  modelPath: string;      // URL to the model weights (from models.model_path)
  testDataUrl: string;    // URL to the test data (from bounties.test_data)
}

/**
 * Triggers an inference job on Modal
 * Replace MODAL_ENDPOINT_URL with your actual Modal web endpoint URL
 */
export async function triggerModalInference({
  modelPath,
  testDataUrl,
}: TriggerInferenceParams): Promise<{ success: boolean; data?: any; message?: string }> {
  const MODAL_ENDPOINT_URL = "https://sohirota--mnist-inference-fastapi-app.modal.run/predict"; // Replace with your actual Modal endpoint

  try {
    const response = await fetch(MODAL_ENDPOINT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_url: modelPath,
        test_url: testDataUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("Modal inference result:", data);

    return {
      success: true,
      data: data,
      message: "Inference completed successfully"
    };
  } catch (error) {
    console.error("Error triggering Modal inference:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to trigger inference"
    };
  }
}
