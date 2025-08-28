import React from 'react';
import { Link } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  Layers,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function Settings() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600">
            Configure CodeGoat application settings and options
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Validation Pipeline Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Validation Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Configure validation stages, priorities, and execution settings for your development workflow.
            </p>
            <Link to="/stage-management">
              <Button className="w-full">
                <Layers className="w-4 h-4 mr-2" />
                Manage Validation Stages
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Permissions Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              Security & Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Configure executor security permissions, command restrictions, and access controls.
            </p>
            <Link to="/permissions">
              <Button className="w-full" variant="outline">
                <Shield className="w-4 h-4 mr-2" />
                Configure Permissions
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Analytics Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Analytics & Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View analytics dashboards, performance metrics, and monitoring data for your validation pipeline.
            </p>
            <Link to="/analytics">
              <Button className="w-full" variant="outline">
                <Activity className="w-4 h-4 mr-2" />
                View Analytics
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-gray-600" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Version:</span>
                <span className="font-mono">v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="font-mono">Development</span>
              </div>
              <div className="flex justify-between">
                <span>Node.js:</span>
                <span className="font-mono">{typeof process !== 'undefined' ? process.version : 'N/A'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link to="/stage-management">
              <Button size="sm" variant="outline">
                <Layers className="w-4 h-4 mr-1" />
                Stage Management
              </Button>
            </Link>
            <Link to="/permissions">
              <Button size="sm" variant="outline">
                <Shield className="w-4 h-4 mr-1" />
                Permissions
              </Button>
            </Link>
            <Link to="/analytics">
              <Button size="sm" variant="outline">
                <Activity className="w-4 h-4 mr-1" />
                Analytics
              </Button>
            </Link>
            <Link to="/workers">
              <Button size="sm" variant="outline">
                Workers
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
