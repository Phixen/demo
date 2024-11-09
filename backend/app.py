from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from scipy.optimize import minimize
import io
import logging


app = Flask(__name__)
# Configure CORS more explicitly
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://127.0.0.1:3000"],
        "methods": ["OPTIONS", "POST", "GET"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    return response

@app.route('/efficient_frontier', methods=['POST'])
def efficient_frontier():
    try:
        # Log the incoming request details
        logger.debug(f"Received request with files: {request.files}")
        logger.debug(f"Form data: {request.form}")
        
        # Get files from request
        files = request.files.getlist('files')
        
        # Log the number of files received
        logger.debug(f"Number of files received: {len(files)}")
        
        if not files:
            return jsonify({"error": "No files provided"}), 400
            
        # Get alpha parameter
        try:
            alpha = float(request.form.get('alpha', 0.5))
        except ValueError:
            return jsonify({"error": "Invalid alpha value"}), 400
            
        # Validate number of files
        if len(files) < 2 or len(files) > 6:
            return jsonify({"error": "Number of files must be between 2 and 6"}), 400

        # Process files and get returns data
        returns_data = []
        for file in files:
            if not file.filename.endswith('.csv'):
                return jsonify({"error": "Only CSV files are supported"}), 400
                
            try:
                df = pd.read_csv(file)
                returns = df['Price'].pct_change().dropna()  # Assuming 'Price' column exists
                returns_data.append(returns)
            except Exception as e:
                return jsonify({"error": f"Error reading CSV file: {str(e)}"}), 400

        # Convert to DataFrame
        returns_df = pd.concat(returns_data, axis=1)
        returns_df.columns = [f'Asset_{i+1}' for i in range(len(files))]

        # Calculate mean returns and covariance matrix
        mean_returns = returns_df.mean()
        cov_matrix = returns_df.cov()

        # Function to calculate portfolio metrics
        def portfolio_metrics(weights):
            portfolio_return = np.sum(mean_returns * weights) * 252  # Annualized return
            portfolio_volatility = np.sqrt(np.dot(weights.T, np.dot(cov_matrix * 252, weights)))
            return portfolio_return, portfolio_volatility

        # Function to minimize for different portfolio objectives
        def objective(weights, alpha, mean_returns, cov_matrix):
            portfolio_return, portfolio_volatility = portfolio_metrics(weights)
            return -alpha * portfolio_return + (1 - alpha) * portfolio_volatility

        # Constraints
        constraints = (
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},  # weights sum to 1
        )
        bounds = tuple((0, 1) for _ in range(len(files)))  # weights between 0 and 1

        # Generate efficient frontier points
        efficient_frontier_points = []
        alphas = np.linspace(0, 1, 50)
        
        for a in alphas:
            result = minimize(
                objective,
                x0=np.array([1/len(files)] * len(files)),
                args=(a, mean_returns, cov_matrix),
                method='SLSQP',
                bounds=bounds,
                constraints=constraints
            )
            
            if result.success:
                ret, vol = portfolio_metrics(result.x)
                efficient_frontier_points.append({
                    "return": ret,
                    "volatility": vol,
                    "weights": result.x.tolist()
                })

        # Calculate specific portfolios
        min_vol_result = minimize(
            lambda w: portfolio_metrics(w)[1],  # Minimize volatility
            x0=np.array([1/len(files)] * len(files)),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        max_ret_result = minimize(
            lambda w: -portfolio_metrics(w)[0],  # Maximize return
            x0=np.array([1/len(files)] * len(files)),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        tradeoff_result = minimize(
            objective,
            x0=np.array([1/len(files)] * len(files)),
            args=(alpha, mean_returns, cov_matrix),
            method='SLSQP',
            bounds=bounds,
            constraints=constraints
        )

        # Prepare response
        response = {
            "efficient_frontier": [
                {
                    "volatility": point["volatility"],
                    "return": point["return"],
                    "weights": point["weights"]
                }
                for point in efficient_frontier_points
            ],
            "minimum_volatility_portfolio": {
                "volatility": portfolio_metrics(min_vol_result.x)[1],
                "return": portfolio_metrics(min_vol_result.x)[0],
                "weights": min_vol_result.x.tolist()
            },
            "maximum_return_portfolio": {
                "volatility": portfolio_metrics(max_ret_result.x)[1],
                "return": portfolio_metrics(max_ret_result.x)[0],
                "weights": max_ret_result.x.tolist()
            },
            "tradeoff_portfolio": {
                "volatility": portfolio_metrics(tradeoff_result.x)[1],
                "return": portfolio_metrics(tradeoff_result.x)[0],
                "weights": tradeoff_result.x.tolist()
            }
        }
            
        return jsonify(response)
            
    except Exception as e:
        logger.exception("Error processing request")
        return jsonify({
            "error": "Server error",
            "details": str(e)
        }), 500

# Add an error handler for larger payloads
@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'error': 'File too large',
        'details': 'The submitted file exceeds the maximum allowed size'
    }), 413

@app.route('/portfolio_optimization', methods=['POST', 'OPTIONS'])
def portfolio_optimization():
    # Handle preflight requests
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        # Get form data
        sector1 = request.form.get('sector1')
        sector2 = request.form.get('sector2')
        risk_factor = float(request.form.get('riskFactor', 0.5))
        
        # Get files from request
        file1 = request.files.get('csvFile1')
        file2 = request.files.get('csvFile2')
        
        if not all([file1, file2]):
            return jsonify({'error': 'Both CSV files are required'}), 400

        # Read CSV files from the uploaded file objects
        try:
            data1 = pd.read_csv(io.StringIO(file1.stream.read().decode("UTF8")))
            file1.stream.seek(0)  # Reset file pointer
            data2 = pd.read_csv(io.StringIO(file2.stream.read().decode("UTF8")))
            file2.stream.seek(0)  # Reset file pointer
        except Exception as e:
            return jsonify({'error': f'Error reading CSV files: {str(e)}'}), 400

        # Validate CSV structure
        required_columns = ['Price']
        for dataset, name in [(data1, 'First'), (data2, 'Second')]:
            if 'Price' not in dataset.columns:
                return jsonify({'error': f'{name} CSV file must contain a "Price" column'}), 400

        # Calculate daily returns
        data1['Returns'] = data1['Price'].pct_change()
        data2['Returns'] = data2['Price'].pct_change()

        # Drop NaN values
        data1 = data1.dropna()
        data2 = data2.dropna()

        # Calculate annualized metrics
        volatility1 = data1['Returns'].std() * np.sqrt(252)
        volatility2 = data2['Returns'].std() * np.sqrt(252)
        mean_return1 = data1['Returns'].mean() * 252
        mean_return2 = data2['Returns'].mean() * 252
        covariance = data1['Returns'].cov(data2['Returns']) * 252

        # Generate efficient frontier points for visualization
        weights = np.linspace(0, 1, 50)
        graph_data = []
        
        for weight in weights:
            portfolio_return = weight * mean_return1 + (1 - weight) * mean_return2
            portfolio_volatility = np.sqrt(
                (weight**2 * volatility1**2) +
                ((1 - weight)**2 * volatility2**2) +
                (2 * weight * (1 - weight) * covariance)
            )
            graph_data.append({
                "name": f"Portfolio {int(weight * 100)}",
                sector1: portfolio_return * 100,  # Convert to percentage
                sector2: portfolio_volatility * 100  # Convert to percentage
            })

        # Calculate optimal portfolio based on risk factor
        def objective(weights, alpha):
            portfolio_return = weights[0] * mean_return1 + weights[1] * mean_return2
            portfolio_volatility = np.sqrt(
                (weights[0]**2 * volatility1**2) +
                (weights[1]**2 * volatility2**2) +
                (2 * weights[0] * weights[1] * covariance)
            )
            return alpha * portfolio_volatility - (1 - alpha) * portfolio_return

        constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
        bounds = [(0, 1), (0, 1)]
        result = minimize(objective, [0.5, 0.5], args=(risk_factor,), 
                        method='SLSQP', bounds=bounds, constraints=constraints)

        # Generate predictions (simple moving average for demonstration)
        window = 5
        predictions = {
            'sector1': data1['Price'].rolling(window=window).mean().tail(10).round(2).tolist(),
            'sector2': data2['Price'].rolling(window=window).mean().tail(10).round(2).tolist()
        }

        response = {
            'predictions': predictions,
            'graphData': graph_data,
            'optimalWeights': {
                'sector1': round(result.x[0] * 100, 2),
                'sector2': round(result.x[1] * 100, 2)
            }
        }

        return jsonify(response)

    except Exception as e:
        print(f"Error: {str(e)}")  # Server-side logging
        return jsonify({'error': str(e)}), 500

if __name__ == "__main__":
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
    app.run(debug=True)