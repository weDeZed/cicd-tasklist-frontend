pipeline {
    agent any

    environment {
        REGISTRY = 'docker.io'
        DOCKER_IMAGE = "${REGISTRY}/wedezed/tasklist-frontend"
        DOCKER_TAG = "${BUILD_NUMBER}"
        
        // Identifiants
        DOCKERHUB_CREDENTIALS_PSW = credentials('juba-dockerhub-password')
        SONARQUBE_TOKEN = credentials('juba-sonar-token')
    }

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Lint & Format') {
            steps {
                sh 'npm run lint'
            }
            catchError(buildResult: 'SUCCESS', stageResult: 'FAILURE') {
                echo "Linting issues found, but continuing pipeline."
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    junit testResults: 'reports/junit.xml'
                }
            }
        }

        stage('E2E Tests') {
            steps {
                sh 'npm run test:e2e'
            }
            post {
                always {
                    junit testResults: 'reports/junit-e2e.xml' 
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarqube-server-1') {
                    sh 'npx sonar-scanner'
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh '''
                docker buildx create --use --name tasklist-builder || true
                docker buildx build \\
                  --tag ${DOCKER_IMAGE}:${DOCKER_TAG} \\
                  --tag ${DOCKER_IMAGE}:latest \\
                  --sbom=true \\
                  --provenance=true \\
                  --load .
                '''
            }
        }

        stage('Trivy Scan') {
            steps {
                sh 'mkdir -p reports'
                sh '''
                trivy image \\
                  --exit-code 1 \\
                  --severity CRITICAL,HIGH \\
                  --format table \\
                  --output reports/trivy-report.txt \\
                  ${DOCKER_IMAGE}:${DOCKER_TAG}
                
                trivy image \\
                  --format json \\
                  --output reports/trivy-report.json \\
                  ${DOCKER_IMAGE}:${DOCKER_TAG}
                
                trivy image \\
                  --format sarif \\
                  --output reports/trivy-report.sarif \\
                  ${DOCKER_IMAGE}:${DOCKER_TAG}
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/trivy-report.*'
                }
            }
        }

        stage('Generate SBOM') {
            steps {
                sh '''
                trivy image \\
                  --format spdx-json \\
                  --output reports/sbom-spdx.json \\
                  ${DOCKER_IMAGE}:${DOCKER_TAG}
                  
                trivy image \\
                  --format cyclonedx \\
                  --output reports/sbom-cyclonedx.json \\
                  ${DOCKER_IMAGE}:${DOCKER_TAG}
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/sbom-*'
                }
            }
        }

        stage('Docker Push') {
            steps {
                sh '''
                echo $DOCKERHUB_CREDENTIALS_PSW | docker login -u $DOCKERHUB_CREDENTIALS_USR --password-stdin
                docker buildx build \\
                  --platform linux/amd64 \\
                  --tag ${DOCKER_IMAGE}:${DOCKER_TAG} \\
                  --tag ${DOCKER_IMAGE}:latest \\
                  --sbom=true \\
                  --provenance=true \\
                  --push .
                '''
            }
            post {
                always {
                    sh 'docker logout'
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Frontend pipeline completed successfully!'
        }
        failure {
            echo 'Frontend pipeline failed!'
        }
    }
}