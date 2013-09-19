using System;
using System.Web.Optimization;

namespace ZRHome {
  public class DurandalBundleConfig {
    public static void RegisterBundles(BundleCollection bundles) {
      bundles.IgnoreList.Clear();
      AddDefaultIgnorePatterns(bundles.IgnoreList);

	  bundles.Add(
		new ScriptBundle("~/Scripts/vendor")
			.Include("~/Scripts/jquery-{version}.js")
			.Include("~/Scripts/bootstrap.js")
			.Include("~/Scripts/knockout-{version}.js")
            .Include("~/Scripts/jquery.isotope.js")
            .Include("~/Scripts/toastr.js")
            .Include("~/Scripts/jquery.lazyload.js")
            //.Include("~/Scripts/site.js")

        );

      bundles.Add(
        new StyleBundle("~/Content/css")
          .Include("~/Content/ie10mobile.css")
          .Include("~/Content/bootstrap/bootstrap.css")
          .Include("~/Content/bootstrap/bootstrap-theme.css")
          .Include("~/Content/font-awesome.css")
		  .Include("~/Content/durandal.css")
          .Include("~/Content/starterkit.css")
          .Include("~/Content/site.css")
          .Include("~/Content/isotope.css")
          .Include("~/Content/toastr.css")
        );
    }

    public static void AddDefaultIgnorePatterns(IgnoreList ignoreList) {
      if(ignoreList == null) {
        throw new ArgumentNullException("ignoreList");
      }

      ignoreList.Ignore("*.intellisense.js");
      ignoreList.Ignore("*-vsdoc.js");
      ignoreList.Ignore("*.debug.js", OptimizationMode.WhenEnabled);
      ignoreList.Ignore("*.min.js", OptimizationMode.WhenDisabled);
      ignoreList.Ignore("*.min.css", OptimizationMode.WhenDisabled);
    }
  }
}