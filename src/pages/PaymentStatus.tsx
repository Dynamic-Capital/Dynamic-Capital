import { Button } from "@/components/ui/button";
import { Link, useSearchParams } from "react-router-dom";
import PaymentStatus from "@/components/receipts/PaymentStatus";

const PaymentStatusPage = () => {
  const [params] = useSearchParams();
  const paymentId = params.get("payment_id");
  const status = params.get("status");

  // If status parameter is provided (legacy), show simple status
  if (status && !paymentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Payment {status === "success" ? "Successful" : "Failed"}</h1>
            <p className="text-muted-foreground">
              {status === "success" 
                ? "Thank you for your purchase! Your plan is now active."
                : "Something went wrong with your payment. Please try again."
              }
            </p>
            <Button asChild>
              <Link to="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto pt-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Payment Status</h1>
          <p className="text-muted-foreground">
            Track your payment and subscription status
          </p>
        </div>

        <PaymentStatus paymentId={paymentId || undefined} />

        <div className="text-center">
          <Button variant="outline" asChild>
            <Link to="/">Return Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentStatusPage;

