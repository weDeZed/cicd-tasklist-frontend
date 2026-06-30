pipeline {
    agent any

    environment {
        DOCKER_REGISTRY = "docker.io"
        DOCKER_IMAGE_NAME = "wedezed/tasklist-frontend"
        DOCKER_CREDENTIALS_ID = "juba-dockerhub-password"

        SONAR_HOST_URL = "https://sonarqube.cicd.kits.ext.educentre.fr"
        SONAR_CREDENTIALS_ID = "juba-sonar-token"
        SONAR_PROJECT_KEY = "juba-cicd-tasklist-backend"

        BUILD_TAG = "${env.BUILD_NUMBER}"
        IMAGE_TAG = "${DOCKER_IMAGE_NAME}:${BUILD_TAG}"
        IMAGE_LATEST = "${DOCKER_IMAGE_NAME}:latest"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "Checking out repository..."
                    checkout scm
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    echo "Installing dependencies with npm ci..."
                    sh 'npm ci --include=dev'
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    echo "Building React/Vite project..."
                    sh 'npm run build'
                }
            }
        }

        stage('Unit Tests') {
            steps {
                script {
                    echo "Running unit tests with coverage..."
                    sh 'npm run test:coverage'
                }
            }
            post {
                always {
                    echo "Archiving test and coverage reports..."
                    archiveArtifacts artifacts: 'coverage/**',
                                      allowEmptyArchive: true
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    echo "Running SonarQube analysis..."
                    withSonarQubeEnv('sonarqube') {
                        sh '''
                            npx sonarqube-scanner \
                              -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                              -Dsonar.sources=src \
                              -Dsonar.tests=src \
                              -Dsonar.test.inclusions=src/**/*.test.tsx,src/**/*.test.ts \
                              -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
                              -Dsonar.sourceEncoding=UTF-8
                        '''
                    }
                }
            }
        }

        stage('SonarQube Quality Gate') {
            steps {
                script {
                    echo "Checking SonarQube Quality Gate..."
                    timeout(time: 5, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: true
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "Building Docker image..."
                    sh '''
                        docker build \
                          -t ${IMAGE_TAG} \
                          -t ${IMAGE_LATEST} \
                          -f Dockerfile \
                          .
                    '''
                }
            }
        }

        stage('Scan with Trivy') {
            steps {
                script {
                    echo "Scanning Docker image with Trivy..."
                    sh '''
                        trivy image \
                          --format json \
                          --output trivy-report.json \
                          --severity HIGH,CRITICAL \
                          ${IMAGE_TAG} || TRIVY_EXIT_CODE=$?

                        trivy image \
                          --format sarif \
                          --output trivy-sarif-report.sarif \
                          --severity HIGH,CRITICAL \
                          ${IMAGE_TAG} || true

                        trivy image \
                          --format table \
                          --severity HIGH,CRITICAL \
                          ${IMAGE_TAG} || true
                    '''
                }
            }
            post {
                always {
                    echo "Archiving Trivy reports..."
                    archiveArtifacts artifacts: 'trivy-*.json,trivy-*.sarif',
                                      allowEmptyArchive: true
                }
            }
        }

        stage('Check Trivy Vulnerabilities') {
            steps {
                script {
                    echo "Checking for HIGH or CRITICAL vulnerabilities..."
                    sh '''
                        CRITICAL_COUNT=$(grep -o '"Severity":"CRITICAL"' trivy-report.json | wc -l || echo 0)
                        HIGH_COUNT=$(grep -o '"Severity":"HIGH"' trivy-report.json | wc -l || echo 0)

                        echo "Found ${CRITICAL_COUNT} CRITICAL and ${HIGH_COUNT} HIGH vulnerabilities"

                        if [ ${CRITICAL_COUNT} -gt 0 ] || [ ${HIGH_COUNT} -gt 0 ]; then
                            echo "Blocking pipeline due to HIGH or CRITICAL vulnerabilities!"
                            exit 1
                        fi

                        echo "No critical vulnerabilities found"
                    '''
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                script {
                    echo "Generating Software Bill of Materials (SBOM)..."
                    sh '''
                        trivy image \
                          --format cyclonedx \
                          --output sbom-cyclonedx.json \
                          ${IMAGE_TAG}

                        trivy image \
                          --format spdx-json \
                          --output sbom-spdx.json \
                          ${IMAGE_TAG}
                    '''
                }
            }
            post {
                always {
                    echo "Archiving SBOM files..."
                    archiveArtifacts artifacts: 'sbom-*.json',
                                      allowEmptyArchive: true
                }
            }
        }

        stage('Publish to Docker Hub') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "Publishing Docker image to Docker Hub..."
                    withCredentials([usernamePassword(credentialsId: env.DOCKER_CREDENTIALS_ID,
                                                     usernameVariable: 'DOCKER_USERNAME',
                                                     passwordVariable: 'DOCKER_PASSWORD')]) {
                        sh '''
                            echo "${DOCKER_PASSWORD}" | docker login -u "${DOCKER_USERNAME}" --password-stdin

                            docker push ${IMAGE_TAG}
                            docker push ${IMAGE_LATEST}

                            docker logout
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "Cleaning up workspace..."
                cleanWs()
            }
        }
        success {
            script {
                echo "Pipeline completed successfully!"
            }
        }
        failure {
            script {
                echo "Pipeline failed!"
            }
        }
        unstable {
            script {
                echo "Pipeline is unstable!"
            }
        }
    }
}