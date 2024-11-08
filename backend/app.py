from flask import Flask, request, jsonify
import pandas as pd
import numpy as np
from scipy.optimize import minimize
import matplotlib.pyplot as plt


app = Flask(__name__)

@app.route('/efficient_frontier', methods=['POST'])
def efficient_frontier():
    data = request.get_json()
    file_path1 = data['file_path1']
    file_path2 = data['file_path2']

    # Load CSV files
    data1 = pd.read_csv(file_path1)
    data2 = pd.read_csv(file_path2)

    # Calculate daily returns
    data1['Returns'] = data1['Price'].pct_change()
    data2['Returns'] = data2['Price'].pct_change()

    # Drop NaN values created by pct_change
    data1 = data1.dropna()
    data2 = data2.dropna()

    # Calculate annualized volatility and mean return for each asset
    volatility1 = data1['Returns'].std() * np.sqrt(252)
    volatility2 = data2['Returns'].std() * np.sqrt(252)
    mean_return1 = data1['Returns'].mean() * 252
    mean_return2 = data2['Returns'].mean() * 252

    # Calculate the covariance between the two assets
    covariance = data1['Returns'].cov(data2['Returns']) * 252  # Annualized covariance

    # Generate efficient frontier for the combined portfolio of both assets
    weights = np.linspace(0, 1, 100)
    combined_efficient_frontier = []

    for weight in weights:
        portfolio_return = weight * mean_return1 + (1 - weight) * mean_return2
        portfolio_volatility = np.sqrt(
            (weight**2 * volatility1**2) +
            ((1 - weight)**2 * volatility2**2) +
            (2 * weight * (1 - weight) * covariance)
        )
        combined_efficient_frontier.append([portfolio_volatility, portfolio_return, weight])

    # Convert to DataFrame for plotting
    combined_efficient_frontier_df = pd.DataFrame(combined_efficient_frontier, columns=['Volatility', 'Return', 'Weight'])

    # Find the minimum volatility portfolio
    min_volatility_portfolio = combined_efficient_frontier_df.loc[combined_efficient_frontier_df['Volatility'].idxmin()]

    # Find the maximum return portfolio
    max_return_portfolio = combined_efficient_frontier_df.loc[combined_efficient_frontier_df['Return'].idxmax()]

    # Prepare the response
    response = {
        "efficient_frontier": combined_efficient_frontier_df.to_dict(orient='records'),
        "minimum_volatility_portfolio": {
            "volatility": min_volatility_portfolio['Volatility'],
            "return": min_volatility_portfolio['Return'],
            "weight1": min_volatility_portfolio['Weight'] * 100,
            "weight2": (1 - min_volatility_portfolio['Weight']) * 100
        },
        "maximum_return_portfolio": {
            "volatility": max_return_portfolio['Volatility'],
            "return": max_return_portfolio['Return'],
            "weight1": max_return_portfolio['Weight'] * 100,
            "weight2": (1 - max_return_portfolio['Weight']) * 100
        }
    }

    return jsonify(response)

@app.route('/portfolio_optimization', methods=['POST'])
def portfolio_optimization():
    data = request.get_json()
    file_path1 = data['file_path1']
    file_path2 = data['file_path2']
    alpha = data['alpha']

    # Load CSV files
    data1 = pd.read_csv(file_path1)
    data2 = pd.read_csv(file_path2)

    # Calculate daily returns
    data1['Returns'] = data1['Price'].pct_change()
    data2['Returns'] = data2['Price'].pct_change()

    # Drop NaN values created by pct_change
    data1 = data1.dropna()
    data2 = data2.dropna()

    # Calculate annualized volatility and mean return for each asset
    volatility1 = data1['Returns'].std() * np.sqrt(252)
    volatility2 = data2['Returns'].std() * np.sqrt(252)
    mean_return1 = data1['Returns'].mean() * 252
    mean_return2 = data2['Returns'].mean() * 252

    # Calculate the covariance between the two assets
    covariance = data1['Returns'].cov(data2['Returns']) * 252  # Annualized covariance

    # Generate efficient frontier for the combined portfolio of both assets
    weights = np.linspace(0, 1, 100)
    combined_efficient_frontier = []

    for weight in weights:
        portfolio_return = weight * mean_return1 + (1 - weight) * mean_return2
        portfolio_volatility = np.sqrt(
            (weight**2 * volatility1**2) +
            ((1 - weight)**2 * volatility2**2) +
            (2 * weight * (1 - weight) * covariance)
        )
        combined_efficient_frontier.append([portfolio_volatility, portfolio_return, weight])

    # Convert to DataFrame for plotting
    combined_efficient_frontier_df = pd.DataFrame(combined_efficient_frontier, columns=['Volatility', 'Return', 'Weight'])

    # Find the minimum volatility portfolio
    min_volatility_portfolio = combined_efficient_frontier_df.loc[combined_efficient_frontier_df['Volatility'].idxmin()]

    # Find the maximum return portfolio
    max_return_portfolio = combined_efficient_frontier_df.loc[combined_efficient_frontier_df['Return'].idxmax()]

    # Define a function for the trade-off between minimum volatility and maximum return
    def tradeoff_objective(weights, alpha):
        # Calculate portfolio return and volatility
        portfolio_return = weights[0] * mean_return1 + weights[1] * mean_return2
        portfolio_volatility = np.sqrt(
            (weights[0]**2 * volatility1**2) +
            (weights[1]**2 * volatility2**2) +
            (2 * weights[0] * weights[1] * covariance)
        )
        # Objective: Weighted combination of volatility and negative return (to maximize return)
        return alpha * portfolio_volatility - (1 - alpha) * portfolio_return

    # Constraints: weights sum to 1
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = [(0, 1), (0, 1)]

    # Optimize for trade-off portfolio
    result = minimize(tradeoff_objective, [0.5, 0.5], args=(alpha,), method='SLSQP', bounds=bounds, constraints=[constraints])

    # Get the trade-off portfolio weights, volatility, and return
    tradeoff_weights = result.x
    tradeoff_volatility = np.sqrt(
        (tradeoff_weights[0]**2 * volatility1**2) +
        (tradeoff_weights[1]**2 * volatility2**2) +
        (2 * tradeoff_weights[0] * tradeoff_weights[1] * covariance)
    )
    tradeoff_return = tradeoff_weights[0] * mean_return1 + tradeoff_weights[1] * mean_return2

    # Prepare the response
    response = {
        "minimum_volatility_portfolio": {
            "asset1_weight": min_volatility_portfolio['Weight'] * 100,
            "asset2_weight": (1 - min_volatility_portfolio['Weight']) * 100
        },
        "maximum_return_portfolio": {
            "asset1_weight": max_return_portfolio['Weight'] * 100,
            "asset2_weight": (1 - max_return_portfolio['Weight']) * 100
        },
        "tradeoff_portfolio": {
            "asset1_weight": tradeoff_weights[0] * 100,
            "asset2_weight": tradeoff_weights[1] * 100,
            "tradeoff_volatility": tradeoff_volatility,
            "tradeoff_return": tradeoff_return
        }
    }

    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)