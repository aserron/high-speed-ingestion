.PHONY: help install lint format type-check test clean dev-install

help:
	@echo "Available commands:"
	@echo "  install     - Install production dependencies"
	@echo "  dev-install - Install development dependencies"
	@echo "  lint        - Run linting (ruff)"
	@echo "  format      - Format code (black + isort + ruff --fix)"
	@echo "  type-check  - Run type checking (mypy)"
	@echo "  test        - Run tests"
	@echo "  clean       - Clean up cache files"

install:
	pip install -e .

dev-install:
	pip install -e ".[dev]"

lint:
	ruff check src/ tests/
	black --check src/ tests/
	isort --check-only src/ tests/

format:
	black src/ tests/
	isort src/ tests/
	ruff check --fix src/ tests/

type-check:
	mypy src/

test:
	pytest

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf htmlcov/